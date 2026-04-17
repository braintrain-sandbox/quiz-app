import Razorpay from 'razorpay';

export function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Missing Razorpay credentials in environment variables');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}
