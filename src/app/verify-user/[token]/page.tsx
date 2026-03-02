// Custom inports
import VerifyUser from "./VerifyUser";

type VerifyUserPageProps = {
    params: Promise<{ token: string }>;
};

const VerifyUserPage: React.FC<VerifyUserPageProps> = async ({ params }) => {
    const { token } = await params;
    
    return (
      <VerifyUser token={token} />
    );
};

export default VerifyUserPage;
