import invariant from 'tiny-invariant';
import {json, redirect, type ActionArgs} from '@shopify/remix-oxygen';

type Subscriber = {
  id: string;
  email: string;
  emailMarketingConsent: {
    consentUpdatedAt: string;
    marketingOptInLevel: string;
    marketingState: string;
  };
};

type CustomerMutationSuccess = {
  customer: Subscriber;
  error: null;
};

type CustomerMutationError = {
  customer: null;
  error: {field: string; message: string};
};

type CustomerMutation = CustomerMutationSuccess | CustomerMutationError;

export async function action({context, request}: ActionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;

  invariant(email, 'Email is required');

  try {
    const existing = await getCustomerConsent({
      email,
      context,
    });

    const alreadySubscribed =
      existing?.customer?.emailMarketingConsent?.marketingState ===
      'SUBSCRIBED';

    // already subscribed?
    if (alreadySubscribed) {
      return await returnSuccess({
        subscriber: existing.customer,
        session: context.session,
      });
    }

    // create or update customer subscriber
    if (!existing.customer) {
      // create
      const created = await createSubscriber({
        email,
        context,
      });

      if (created.error) {
        return returnError({error: created.error});
      }

      return await returnSuccess({
        subscriber: created.customer,
        session: context.session,
      });
    } else {
      // else, update existing
      const updated = await updateCustomerMarketingConsent({
        customerId: existing.customer.id,
        context,
      });

      if (updated.error) {
        return returnError({error: updated.error});
      }

      return await returnSuccess({
        subscriber: updated.customer,
        session: context.session,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return returnError({error});
    }
    return returnError({error: {message: JSON.stringify(error)}});
  }
}

export function loader() {
  return redirect('/');
}

/**
 * Returns a success response with a cookie for marketing consent
 * @param subscriber
 * @param session
 */
async function returnSuccess({
  subscriber,
  session,
}: {
  subscriber: Subscriber;
  session: ActionArgs['context']['session'];
}) {
  // persist the marketing consent in a cookie so it can be read in the newsletter form
  // to show if a user is already subscribed without having to make an API call
  session.set(
    'emailMarketingConsent',
    subscriber.emailMarketingConsent.marketingState,
  );
  return json(
    {subscriber, error: null},
    {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    },
  );
}

function returnError({error}: {error: {message: string}}) {
  return json({subscriber: null, error});
}

const CUSTOMER_FRAGMENT = `#graphql
  fragment CustomerFragment on Customer {
    id
    email
    emailMarketingConsent{
      consentUpdatedAt
      marketingOptInLevel
      marketingState
    }
  }
`;

/**
 * Get a customer marketing consent by email
 * @param email
 * @param context
 */
async function getCustomerConsent({
  email,
  context,
}: {
  email: string;
  context: ActionArgs['context'];
}) {
  const CUSTOMER_EMAIL_CONSENT_QUERY = `#graphql
    ${CUSTOMER_FRAGMENT}
    query getCustomerByEmail($query: String!) {
      customers(first: 1, query: $query ) {
        edges {
          node {
            ...CustomerFragment
          }
        }
      }
    }
  `;

  const {customers} = await context.admin(CUSTOMER_EMAIL_CONSENT_QUERY, {
    variables: {query: `email:${email}`},
  });

  const customer = customers.edges[0].node;

  if (!customer) {
    return {customer: null, error: null};
  }

  return {customer, error: null};
}

/**
 * Update a customer's marketing consent
 * @param customerId
 * @param context
 */
async function updateCustomerMarketingConsent({
  customerId,
  context,
}: {
  customerId: string;
  context: ActionArgs['context'];
}): Promise<CustomerMutation> {
  const consentUpdatedAt = new Date(
    new Date().getTime() - new Date().getTimezoneOffset() * 60000,
  ).toISOString();

  const UPDATE_CUSTOMER_MARKETING_CONSENT = `#graphql
    ${CUSTOMER_FRAGMENT}
    mutation ($input: CustomerEmailMarketingConsentUpdateInput!) {
      customerEmailMarketingConsentUpdate(input: $input) {
        customer {
          ...CustomerFragment
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    customerId,
    emailMarketingConsent: {
      consentUpdatedAt,
      marketingOptInLevel: 'SINGLE_OPT_IN',
      marketingState: 'SUBSCRIBED',
    },
  };

  const {customerEmailMarketingConsentUpdate} = await context.admin(
    UPDATE_CUSTOMER_MARKETING_CONSENT,
    {
      variables: {input},
    },
  );

  if (customerEmailMarketingConsentUpdate.userErrors.length) {
    const [{field, message}] = customerEmailMarketingConsentUpdate.userErrors;
    return {error: {field, message}, customer: null};
  }

  // success
  return {
    customer: customerEmailMarketingConsentUpdate.customer,
    error: null,
  };
}

async function createSubscriber({
  email,
  context,
}: {
  email: string;
  context: ActionArgs['context'];
}): Promise<CustomerMutation> {
  const CREATE_SUBSCRIBER = `#graphql
    ${CUSTOMER_FRAGMENT}
    mutation newCustomerLead($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          ...CustomerFragment
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const consentUpdatedAt = new Date(
    new Date().getTime() - new Date().getTimezoneOffset() * 60000,
  ).toISOString();

  const input = {
    email,
    acceptsMarketing: true,
    // or smsMarketingConsent if subscribing via phone number
    emailMarketingConsent: {
      consentUpdatedAt,
      marketingOptInLevel: 'SINGLE_OPT_IN',
      marketingState: 'SUBSCRIBED',
    },
    tags: ['newsletter'],
  };

  const {customerCreate} = await context.admin(CREATE_SUBSCRIBER, {
    variables: {input},
  });

  if (customerCreate.userErrors.length) {
    const [{field, message}] = customerCreate.userErrors;
    return {error: {field, message}, customer: null};
  }

  // success
  const {customer} = customerCreate;
  return {customer, error: null};
}
