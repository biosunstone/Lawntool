import { Suspense } from 'react';
import CheckoutSuccessContent from './CheckoutSuccessContent';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Loading Order Details...</h2>
              <p className="text-gray-600">Please wait while we confirm your order</p>
            </div>
          </div>
        }>
          <CheckoutSuccessContent />
        </Suspense>
      </div>
    </div>
  );
}