"use client";

// Library imports
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

type NavbarProps = {
    showLogin: (() => void);
    authenticated: boolean;
};

const Navbar: React.FC<NavbarProps> = ({showLogin, authenticated}) => {
    return (
      <div className="flex items-center justify-between sm:px-12 px-2 md:px-24">
        <Link href="/" className="flex items-center justify-center h-20">
          <Image src="/images/logo.png"
                 alt="TeacherCollab"
                 height={200}
                 width={200}
                 priority
                 style={{ width: 'auto', height: '100%' }}
          />
        </Link>
        <div className="flex items-center">
          {/* Show 'Sign Out'/'Sign In' button */}
          <button className="bg-cardinal-red text-white px-2 py-1 sm:px-4 rounded-md text-sm font-medium border-2 border-transparent hover:text-cardinal-red hover:bg-white hover:border-2 hover:border-cardinal-red transition duration-300 ease-in-out"
                  onClick={ authenticated ? () => {signOut({ callbackUrl: '/'})} : showLogin}
          >
            {authenticated ? 'Sign Out' : 'Sign In'}
          </button>
        </div>
      </div>
    );
}
export default Navbar;