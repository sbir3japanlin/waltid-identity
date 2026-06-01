import type { CredentialCard as CredentialCardType } from '../types';
import { Card, Badge } from '@shared';
import { FileText, Calendar } from 'lucide-react';

interface Props {
  credential: CredentialCardType;
}

export function CredentialCard({ credential }: Props) {
  return (
    <Card hover className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="font-medium text-sm text-slate-800">{credential.type}</p>
          <p className="text-xs text-slate-400">{credential.issuer}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar className="w-3 h-3" />
          {new Date(credential.issuedAt).toLocaleDateString()}
        </div>
        <Badge variant={credential.format === 'mdoc' ? 'mdoc' : credential.format === 'sd-jwt' ? 'sd-jwt' : 'jwt-vc'}>
          {credential.format === 'mdoc' ? 'mDoc' : credential.format === 'sd-jwt' ? 'SD-JWT' : 'JWT VC'}
        </Badge>
      </div>
    </Card>
  );
}
