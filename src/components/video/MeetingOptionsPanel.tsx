import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Video, FileText, ListChecks, Brain, Shield } from 'lucide-react';

interface MeetingOptionsProps {
  onStart: (options: MeetingOptions) => void;
  onCancel: () => void;
  defaultTitle?: string;
  organizationId?: string;
  organizationName?: string;
}

export interface MeetingOptions {
  title: string;
  sessionType: 'training' | 'uat' | 'admin_ops' | 'onboarding' | 'support' | 'general';
  recordAudio: boolean;
  transcribe: boolean;
  generateSummary: boolean;
  trackActions: boolean;
  organizationId?: string;
}

const sessionTypeDescriptions: Record<string, string> = {
  training: 'Focus on completion gaps, questions, certification readiness',
  uat: 'Focus on bugs, blockers, reproduction steps',
  admin_ops: 'Focus on approvals, seats, pipeline health',
  onboarding: 'Focus on registration gaps, invite status',
  support: 'Focus on access issues, account fixes',
  general: 'General operational discussion',
};

export const MeetingOptionsPanel = ({
  onStart,
  onCancel,
  defaultTitle = '',
  organizationId,
  organizationName,
}: MeetingOptionsProps) => {
  const [title, setTitle] = useState(defaultTitle);
  const [sessionType, setSessionType] = useState<MeetingOptions['sessionType']>('general');
  const [recordAudio, setRecordAudio] = useState(true);
  const [transcribe, setTranscribe] = useState(true);
  const [generateSummary, setGenerateSummary] = useState(true);
  const [trackActions, setTrackActions] = useState(true);

  const handleStart = () => {
    onStart({
      title: title || `${sessionType} Session`,
      sessionType,
      recordAudio,
      transcribe,
      generateSummary,
      trackActions,
      organizationId,
    });
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle>Agent-Covered Session</CardTitle>
        </div>
        <CardDescription>
          AI agent will capture, transcribe, and summarize this session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Session Title</Label>
          <Input
            id="title"
            placeholder="Enter session title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Session Type */}
        <div className="space-y-2">
          <Label>Session Type</Label>
          <Select value={sessionType} onValueChange={(v) => setSessionType(v as MeetingOptions['sessionType'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="training">Training Session</SelectItem>
              <SelectItem value="uat">UAT Walkthrough</SelectItem>
              <SelectItem value="admin_ops">Admin Operations</SelectItem>
              <SelectItem value="onboarding">Dispensary Onboarding</SelectItem>
              <SelectItem value="support">Support Call</SelectItem>
              <SelectItem value="general">General Meeting</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {sessionTypeDescriptions[sessionType]}
          </p>
        </div>

        {/* Organization Context */}
        {organizationName && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Organization</p>
            <p className="font-medium">{organizationName}</p>
          </div>
        )}

        {/* Agent Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Agent Coverage</Label>
          
          <div className="grid gap-3">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="record"
                checked={recordAudio}
                onCheckedChange={(c) => setRecordAudio(c === true)}
              />
              <div className="flex-1">
                <Label htmlFor="record" className="flex items-center gap-2 cursor-pointer">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  Record Session
                </Label>
                <p className="text-xs text-muted-foreground">Capture audio for transcription</p>
              </div>
              <Badge variant="outline" className="text-xs">Default ON</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="transcribe"
                checked={transcribe}
                onCheckedChange={(c) => setTranscribe(c === true)}
              />
              <div className="flex-1">
                <Label htmlFor="transcribe" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Transcribe
                </Label>
                <p className="text-xs text-muted-foreground">Speaker-attributed transcript</p>
              </div>
              <Badge variant="outline" className="text-xs">Default ON</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="summary"
                checked={generateSummary}
                onCheckedChange={(c) => setGenerateSummary(c === true)}
              />
              <div className="flex-1">
                <Label htmlFor="summary" className="flex items-center gap-2 cursor-pointer">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  Generate Summary
                </Label>
                <p className="text-xs text-muted-foreground">AI summary with key outcomes</p>
              </div>
              <Badge variant="outline" className="text-xs">Default ON</Badge>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="actions"
                checked={trackActions}
                onCheckedChange={(c) => setTrackActions(c === true)}
              />
              <div className="flex-1">
                <Label htmlFor="actions" className="flex items-center gap-2 cursor-pointer">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  Track Action Items
                </Label>
                <p className="text-xs text-muted-foreground">Extract tasks and decisions</p>
              </div>
              <Badge variant="outline" className="text-xs">Default ON</Badge>
            </div>
          </div>
        </div>

        {/* Consent Notice */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            All participants will be notified that this session is being recorded and covered by AI. 
            Consent is required to join.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleStart} className="flex-1">
            <Bot className="h-4 w-4 mr-2" />
            Start Covered Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
