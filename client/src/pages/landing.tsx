// import { getLoginUrl } from "@/const";
// import { Button } from "@/components/ui/button";
// import { useAuth } from "@/_core/hooks/useAuth";
// import { Navigate } from "react-router-dom";

// export default function LandingPage() {
//   const { isAuthenticated, loading } = useAuth();

//   if (loading) return null;
//   if (isAuthenticated) return <Navigate to="/home" replace />;

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-background">
//       <div className="text-center space-y-6">
//         <h1 className="text-4xl font-bold tracking-tighter mb-4">
//           Welcome to Multi User Real Time Text Editor
//         </h1>
//         <p className="text-muted-foreground mb-8">
//           Collaborate on documents in real-time
//         </p>
//         <Button
//           size="lg"
//           onClick={() => (window.location.href = getLoginUrl())}
//           className="px-8"
//         >
//           Sign in with Google
//         </Button>
//       </div>
//     </div>
//   );
// }
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0b486b] to-[#f56217]">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold tracking-tighter mb-4 text-white font-['Inter']">
          Welcome to <br /> Multi User Real Time Text Editor
        </h1>
        <p className="text-gray-100 mb-9 font-['Montserrat']">
          Collaborate on documents in real-time
        </p>
        <Button
          size="lg"
          onClick={() => (window.location.href = getLoginUrl())}
          className=" text-2xl px-9 bg-white text-[#0b486b] hover:bg-gray-100 hover:text-[#f56217] transition-colors font-['Montserrat']"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}