import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
     Elements,
     PaymentElement,
     useStripe,
     useElements,
} from '@stripe/react-stripe-js';

// Load Stripe outside component to avoid re-render re-init
const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const stripePromise = loadStripe(stripeKey);

const API_URL = '/api/create-payment-intent';

// ─────────────────────────────────────────────
// Inner form — rendered INSIDE <Elements>
// ─────────────────────────────────────────────
const PaymentForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
     const stripe = useStripe();
     const elements = useElements();

     const [isSubmitting, setIsSubmitting] = useState(false);
     const [errorMessage, setErrorMessage] = useState<string | null>(null);

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!stripe || !elements) return;

          setIsSubmitting(true);
          setErrorMessage(null);

          const { error } = await stripe.confirmPayment({
               elements,
               confirmParams: {
                    return_url: `${window.location.origin}/success`,
               },
               redirect: 'if_required', // stay on page if no redirect needed
          });

          if (error) {
               setErrorMessage(error.message ?? 'An unknown error occurred.');
               setIsSubmitting(false);
          } else {
               // Payment succeeded without redirect
               onSuccess();
          }
     };

     return (
          <form onSubmit={handleSubmit} style={styles.form}>
               <PaymentElement />

               {errorMessage && (
                    <div style={styles.error}>
                         <span style={styles.errorIcon}>⚠️</span> {errorMessage}
                    </div>
               )}

               <button
                    type="submit"
                    disabled={isSubmitting || !stripe || !elements}
                    style={{
                         ...styles.payButton,
                         ...(isSubmitting ? styles.payButtonDisabled : {}),
                    }}
               >
                    {isSubmitting ? (
                         <span style={styles.loader}>Processing...</span>
                    ) : (
                         '💳 Pay $9.00'
                    )}
               </button>
          </form>
     );
};

// ─────────────────────────────────────────────
// Outer wrapper — fetches clientSecret, wraps <Elements>
// ─────────────────────────────────────────────
interface CheckoutFormProps {
     amount: number;        // in cents, e.g. 900 = $9.00
     currency?: string;     // default 'usd'
     customerEmail: string;
     onSuccess?: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
     amount,
     currency = 'usd',
     customerEmail,
     onSuccess,
}) => {
     const [clientSecret, setClientSecret] = useState<string | null>(null);
     const [fetchError, setFetchError] = useState<string | null>(null);
     const [succeeded, setSucceeded] = useState(false);

     useEffect(() => {
          const createIntent = async () => {
               try {
                    const res = await fetch(API_URL, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ amount, currency, customerEmail }),
                    });

                    // Safely parse — proxy/server-down responses may not be JSON
                    const text = await res.text();
                    let data: any = {};
                    try { data = JSON.parse(text); } catch {
                         throw new Error(res.ok ? 'Invalid server response.' : `Server error ${res.status}: API server may be offline.`);
                    }

                    if (!res.ok) throw new Error(data.message || `Server error ${res.status}`);
                    setClientSecret(data.clientSecret);
               } catch (err: any) {
                    setFetchError(err.message);
               }
          };

          if (customerEmail) createIntent();
     }, [amount, currency, customerEmail]);

     const handleSuccess = () => {
          setSucceeded(true);
          onSuccess?.();
     };

     // ── States ──────────────────────────────────
     if (succeeded) {
          return (
               <div style={styles.successBox}>
                    <div style={styles.successIcon}>🎉</div>
                    <h3 style={styles.successTitle}>Payment Successful!</h3>
                    <p style={styles.successText}>
                         Your payment has been confirmed. Check your email for a receipt.
                    </p>
               </div>
          );
     }

     if (fetchError) {
          return (
               <div style={styles.errorBox}>
                    <div style={styles.errorIcon}>❌</div>
                    <h3 style={styles.errorTitle}>Could Not Load Checkout</h3>
                    <p style={styles.errorText}>{fetchError}</p>
               </div>
          );
     }

     if (!clientSecret) {
          return (
               <div style={styles.loadingBox}>
                    <div style={styles.spinner} />
                    <p style={styles.loadingText}>Setting up secure checkout...</p>
               </div>
          );
     }

     return (
          <div style={styles.container}>
               <h2 style={styles.title}>Complete Your Payment</h2>
               <p style={styles.subtitle}>
                    One-time payment of <strong>${(amount / 100).toFixed(2)}</strong> for full access.
               </p>

               <Elements
                    stripe={stripePromise}
                    options={{
                         clientSecret,
                         appearance: {
                              theme: 'stripe',
                              variables: {
                                   colorPrimary: '#0f172a',
                                   colorBackground: '#f8fafc',
                                   borderRadius: '8px',
                                   fontFamily: 'Inter, Segoe UI, sans-serif',
                              },
                         },
                    }}
               >
                    <PaymentForm onSuccess={handleSuccess} />
               </Elements>

               <p style={styles.secureNote}>🔒 Payments are processed securely by Stripe.</p>
          </div>
     );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
     container: {
          maxWidth: 480,
          margin: '0 auto',
          padding: '24px 20px',
          fontFamily: 'Inter, Segoe UI, sans-serif',
     },
     title: {
          fontSize: 22,
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 6px',
     },
     subtitle: {
          fontSize: 14,
          color: '#09254bff',
          margin: '0 0 24px',
     },
     form: {
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
     },
     payButton: {
          marginTop: 8,
          padding: '14px 0',
          background: '#0f172a',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'background 0.2s',
     },
     payButtonDisabled: {
          background: '#94a3b8',
          cursor: 'not-allowed',
     },
     loader: { opacity: 0.8 },
     error: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 14,
     },
     errorIcon: { marginRight: 6 },
     // Success
     successBox: {
          textAlign: 'center',
          padding: '40px 24px',
     },
     successIcon: { fontSize: 48, marginBottom: 12 },
     successTitle: {
          fontSize: 22,
          fontWeight: 700,
          color: '#16a34a',
          margin: '0 0 8px',
     },
     successText: { color: '#64748b', fontSize: 14 },
     // Error box
     errorBox: { textAlign: 'center', padding: '40px 24px' },
     errorTitle: {
          fontSize: 20,
          fontWeight: 700,
          color: '#dc2626',
          margin: '0 0 8px',
     },
     errorText: { color: '#64748b', fontSize: 14 },
     // Loading
     loadingBox: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '40px 24px',
     },
     spinner: {
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '4px solid #e2e8f0',
          borderTopColor: '#0f172a',
          animation: 'spin 0.8s linear infinite',
     },
     loadingText: { color: '#94a3b8', fontSize: 14 },
     secureNote: {
          textAlign: 'center',
          fontSize: 13,
          color: '#334155',
          marginTop: 16,
          fontWeight: 500,
     },
};

export default CheckoutForm;
