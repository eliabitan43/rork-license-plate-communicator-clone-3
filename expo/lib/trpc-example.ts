// Example usage of tRPC client
// You can use this in any component like this:

import { trpc } from '@/lib/trpc';

export function ExampleTRPCUsage() {
  // Using tRPC with React Query
  const hiMutation = trpc.example.hi.useMutation();

  const handleTestAPI = async () => {
    try {
      const result = await hiMutation.mutateAsync({ name: 'World' });
      console.log('tRPC Response:', result);
      // Result will be: { hello: 'World', date: Date }
    } catch (error) {
      console.error('tRPC Error:', error);
    }
  };

  return (
    // Your component JSX here
    // Call handleTestAPI() to test the backend
    null
  );
}