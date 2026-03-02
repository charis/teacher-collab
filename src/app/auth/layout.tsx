// Library imports
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// AuthLayout
export default function AuthLayout({children}: {children: React.ReactNode}) {
  return (
      <>
        <ToastContainer/>
          {children}
      </>
  );
};
