import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, X, ArrowLeft } from 'lucide-react';
import { useUnifiedVoice } from '@/providers/UnifiedVoiceProvider';

interface VoiceSettingsPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  isVisible,
  onClose
}) => {
  const { 
    settings, 
    updateSettings, 
    speak, 
    stop, 
    isSpeaking, 
    availableVoices,
    isSupported 
  } = useUnifiedVoice();
  
  const [testText] = useState("Hey there! I'm ProCann Assist, your Maryland cannabis training assistant. How does this voice sound to you?");

  const handleTestVoice = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(testText, { priority: 'high' });
    }
  };

  const getVoicesByGender = (gender: string) => {
    return availableVoices.filter(voice => {
      const name = voice.name.toLowerCase();
      switch (gender) {
        case 'female':
          return name.includes('female') || 
                 name.includes('woman') || 
                 name.includes('zira') || 
                 name.includes('hazel') ||
                 name.includes('samantha') ||
                 name.includes('serena') ||
                 (!name.includes('male') && !name.includes('man') && !name.includes('david'));
        case 'male':
          return name.includes('male') || 
                 name.includes('man') || 
                 name.includes('david') || 
                 name.includes('mark') ||
                 name.includes('daniel');
        default:
          return true;
      }
    });
  };

  // Handle escape key to close panel
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    
    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !isSupported) return null;

  return (
    <Card className="w-full max-w-md bg-background border shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Voice Settings</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Volume2 className="h-3 w-3 mr-1" />
              {isSpeaking ? 'Speaking' : 'Ready'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Voice Enable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="voice-enabled" className="text-sm font-medium">
            Enable Voice
          </Label>
          <Switch
            id="voice-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateSettings({ enabled })}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Gender Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Voice Gender</Label>
              <Select
                value={settings.gender}
                onValueChange={(gender: 'female' | 'male' | 'neutral') => 
                  updateSettings({ gender })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Voice ({getVoicesByGender(settings.gender).length} available)
              </Label>
              <Select
                value={settings.voice || ''}
                onValueChange={(voice) => updateSettings({ voice })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {getVoicesByGender(settings.gender).map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} {voice.localService ? '(Built-in)' : '(Cloud)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rate Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Speaking Rate</Label>
                <Badge variant="outline">{settings.rate.toFixed(1)}x</Badge>
              </div>
              <Slider
                value={[settings.rate]}
                onValueChange={([rate]) => updateSettings({ rate })}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Pitch Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Pitch</Label>
                <Badge variant="outline">{settings.pitch.toFixed(1)}</Badge>
              </div>
              <Slider
                value={[settings.pitch]}
                onValueChange={([pitch]) => updateSettings({ pitch })}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Volume</Label>
                <Badge variant="outline">{Math.round(settings.volume * 100)}%</Badge>
              </div>
              <Slider
                value={[settings.volume]}
                onValueChange={([volume]) => updateSettings({ volume })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Test Voice */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Test Voice</Label>
              <Button
                onClick={handleTestVoice}
                variant="outline"
                className="w-full"
                disabled={!settings.voice}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Voice
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
          <Button
            onClick={() => {
              updateSettings({
                rate: 1,
                pitch: 1,
                volume: 0.8,
                gender: 'female'
              });
            }}
            variant="ghost"
            size="sm"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};