import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useFetcher, useLoaderData} from '@remix-run/react';

export async function loader({context}: LoaderArgs) {
  const {session} = context;
  const emailMarketingConsent =
    (await session.get('emailMarketingConsent')) || null;
  const subscribedToNewsletter = emailMarketingConsent === 'SUBSCRIBED';
  return json({
    subscribedToNewsletter,
  });
}

export default function Newsletter() {
  const {subscribedToNewsletter} = useLoaderData();
  const {Form, ...fetcher} = useFetcher();
  const {data} = fetcher;
  const subscribeSuccess = data?.subscriber;
  const subscribeError = data?.error;

  return (
    <div>
      <h3>Newsletter</h3>
      <p>Subscribe to our newsletter to get the latest updates.</p>
      <br />

      {subscribeSuccess ? (
        <p style={{color: 'green'}}>
          You have successfully subscribed to our newsletter!
        </p>
      ) : subscribedToNewsletter ? (
        <p style={{color: 'blue'}}>
          You are already subscribed to our newsletter!
        </p>
      ) : (
        <Form method="post" action="/newsletter">
          <input
            placeholder="Your email"
            type="email"
            name="email"
            id="email"
          />
          <button type="submit">Subscribe</button>
        </Form>
      )}
      {subscribeError && <p style={{color: 'red'}}>{data.error.message}</p>}
    </div>
  );
}
