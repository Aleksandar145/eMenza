"use client";



import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { useSearchParams } from "next/navigation";

import { Suspense } from "react";



function SSOCallbackInner() {

  const searchParams = useSearchParams();

  const intent = searchParams.get("intent");

  const isSignUp = intent === "signUp";

  const studentHome = "/";

  const registerVerify = "/register?korak=potvrda";



  return (

    <AuthenticateWithRedirectCallback

      signInForceRedirectUrl={studentHome}

      signUpForceRedirectUrl={registerVerify}

      signInFallbackRedirectUrl={studentHome}

      signUpFallbackRedirectUrl={registerVerify}

      continueSignUpUrl={isSignUp ? registerVerify : undefined}

    />

  );

}



export default function SSOCallbackPage() {

  return (

    <Suspense fallback={null}>

      <SSOCallbackInner />

    </Suspense>

  );

}

