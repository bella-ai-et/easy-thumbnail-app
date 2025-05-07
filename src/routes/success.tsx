import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { CheckCircle, ChevronRight, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";

export const Route = createFileRoute('/success')({ 
  component: Success,
  ssr: true,
})

function Success() {
  const { user, isLoaded } = useUser();
  const subscription = useQuery(api.transactions.getUserSubscription);
  const [isAnimating, setIsAnimating] = useState(true);

  // Animation effect when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16">
      <div className="w-full max-w-md mx-auto text-center">
        {/* Success animation */}
        <div 
          className={`mb-8 mx-auto rounded-full bg-[#E8F4FF] w-24 h-24 flex items-center justify-center transition-all duration-1000 ease-out ${
            isAnimating ? "scale-50 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <CheckCircle className="w-12 h-12 text-[#0066CC]" />
        </div>

        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-3">
          Payment Successful!
        </h1>
        
        <p className="text-[#86868B] text-lg mb-8">
          Thank you for your purchase. You now have access to all premium features.
        </p>

        {isLoaded && user && subscription && subscription.length > 0 && (
          <div className="bg-white rounded-[24px] p-6 mb-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-medium text-[#1D1D1F] mb-4">Order Summary</h3>
            
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[#86868B]">Plan</span>
                <span className="font-medium text-[#1D1D1F]">
                  Image Pack
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[#86868B]">Status</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-600"></span>
                  Active
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[#86868B]">Credits purchased</span>
                <span className="font-medium text-[#1D1D1F]">
                  {subscription[0]?.quantity || 5}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link to="/dashboard">
            <Button className="w-full h-12 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all">
              Go to Dashboard
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          
          <Link to="/">
            <Button variant="outline" className="w-full h-12 text-base rounded-[14px] border-[#D1D1D6] text-[#1D1D1F] hover:bg-gray-50 transition-all">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}