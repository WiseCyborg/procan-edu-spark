import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Send, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { DOMAINS } from '@/config/domains';

interface ActivationToken {
  id: string;
  token: string;
  organization_id: string;
  created_by: string;
  expires_at: string;
  uses_remaining: number;
  created_at: string;
}

export const AiLeanActivationQR = () => {
  const [tokens, setTokens] = useState<ActivationToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from('ailean_activation_tokens')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const generateToken = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30-day validity

      const { data, error } = await supabase
        .from('ailean_activation_tokens')
        .insert([{
          organization_id: profile.organization_id,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          uses_remaining: 10
        }])
        .select()
        .single();

      if (error) throw error;

      setTokens([data, ...tokens]);
      setSelectedToken(data.token);
      toast.success('Activation token generated!');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const copyActivationLink = (token: string) => {
    const link = `${DOMAINS.PRODUCTION}/activate-ailean?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Activation link copied to clipboard!');
  };

  const revokeToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('ailean_activation_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      setTokens(tokens.filter(t => t.id !== tokenId));
      if (selectedToken === tokenId) setSelectedToken(null);
      toast.success('Token revoked');
    } catch (error) {
      console.error('Error revoking token:', error);
      toast.error('Failed to revoke token');
    }
  };

  const activeToken = tokens.find(t => t.token === selectedToken) || tokens[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            AiLean Mobile Activation
          </CardTitle>
          <CardDescription>
            Generate QR codes and activation links for managers to easily access AiLean on their mobile devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generate Token Button */}
          <div className="flex gap-4">
            <Button 
              onClick={generateToken} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Generate New Token
            </Button>
          </div>

          {/* QR Code Display */}
          {activeToken && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-center p-6 bg-white rounded-lg border">
                  <QRCode
                    value={`${DOMAINS.PRODUCTION}/activate-ailean?token=${activeToken.token}`}
                    size={200}
                  />
                </div>
                <div className="text-center space-y-2">
                  <Badge variant="secondary">
                    {activeToken.uses_remaining} activations remaining
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Expires: {new Date(activeToken.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Activation Link</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      readOnly
                      value={`${DOMAINS.PRODUCTION}/activate-ailean?token=${activeToken.token}`}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyActivationLink(activeToken.token)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Send via Email</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="manager@dispensary.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                    <Button size="sm" variant="outline">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Send via SMS</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                    <Button size="sm" variant="outline">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeToken(activeToken.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Revoke This Token
                </Button>
              </div>
            </div>
          )}

          {/* Active Tokens List */}
          {tokens.length > 1 && (
            <div className="space-y-2">
              <Label>Active Tokens</Label>
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                      selectedToken === token.token ? 'border-primary bg-accent' : ''
                    }`}
                    onClick={() => setSelectedToken(token.token)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {token.token.substring(0, 20)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {new Date(token.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {token.uses_remaining} left
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
