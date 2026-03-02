// Custom inports
import ResetPassword from "./ResetPassword";

type ResetPasswordPageProps = {
    params: Promise<{ token: string }>;
};

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = async ({ params }) => {
    const { token } = await params;
    
    return (
      <ResetPassword token={token} />
    );
};

export default ResetPasswordPage;
