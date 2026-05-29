"use client"
import React from 'react'


const page = () => {
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const tokenMatch = document.cookie.match(/(?:^|; )token=([^;]*)/);
      const roleMatch = document.cookie.match(/(?:^|; )userRole=([^;]*)/);
      if (roleMatch) {
        setRole(decodeURIComponent(roleMatch[1]));
      } else {
        // No role, redirect to login
        window.location.href = '/auth/login';
        return;
      }
      if (!tokenMatch) {
        // No token, redirect to login
        window.location.href = '/auth/login';
        return;
      }
    }
  }, []);

  return (
    <div className='font-bold text-xl'>
      Welcome {role ? `Role: ${role}` : 'Redirecting to login...'}
    </div>
  );
}

export default page
