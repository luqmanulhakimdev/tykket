import { redirect } from 'next/navigation';

// Opt out of instant-navigation static shell validation for redirecting root
export const instant = false;

export default function RootPage() {
  // Direct entry point goes to login first
  redirect('/login');
}
