import { Suspense } from 'react';
import CartRecoveryContent from './CartRecoveryContent';

export default function CartRecoveryPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Loading Cart Recovery...</h2>
              <p className="text-gray-600">Please wait while we prepare your cart recovery</p>
            </div>
          </div>
        }>
          <CartRecoveryContent />
        </Suspense>
      </div>
    </div>
  );
}