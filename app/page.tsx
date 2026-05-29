import { redirect } from 'next/navigation';

export default function HomePage() {
  // Logic: Since this is the landing page, we immediately send them to login
  // In a real app, you'd check auth here first
  redirect('/login');
  
  // This part never actually renders
  return null;
}