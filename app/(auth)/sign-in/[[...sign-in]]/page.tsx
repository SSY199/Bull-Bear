import { SignIn } from '@clerk/nextjs';

const SignInPage = () => {
  return (
    <div className="flex justify-center py-6">
      <SignIn
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
      />
    </div>
  );
};

export default SignInPage;
