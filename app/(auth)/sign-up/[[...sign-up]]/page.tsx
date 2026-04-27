import { SignUp } from '@clerk/nextjs';

const SignUpPage = () => {
  return (
    <div className="flex justify-center py-6">
      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/"
      />
    </div>
  );
};

export default SignUpPage;
