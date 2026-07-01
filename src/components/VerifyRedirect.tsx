import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/**
 * Preserves legacy verify links by forwarding them to the canonical `/verify`
 * route. Accepts a code via `?code`, `?cert`, or the `:certificateId` param.
 */
export const VerifyRedirect = () => {
  const [params] = useSearchParams();
  const { certificateId } = useParams();
  const code = certificateId || params.get('code') || params.get('cert') || '';
  const target = code ? `/verify?code=${encodeURIComponent(code)}` : '/verify';
  return <Navigate to={target} replace />;
};

export default VerifyRedirect;
