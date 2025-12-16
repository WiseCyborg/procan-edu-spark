-- Fix Critical Gap #1: Add RLS policies to video_calls table
CREATE POLICY "Users can view calls they participate in"
ON public.video_calls
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_call_participants vcp
    WHERE vcp.call_id = video_calls.id AND vcp.user_id = auth.uid()
  )
  OR host_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers and admins can create calls"
ON public.video_calls
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'dispensary_manager') 
  OR has_role(auth.uid(), 'training_coordinator')
);

CREATE POLICY "Call hosts can update their calls"
ON public.video_calls
FOR UPDATE
USING (host_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Fix Critical Gap #2: Add RLS policies to video_call_participants table
CREATE POLICY "Users can view their own participation"
ON public.video_call_participants
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Call hosts can manage participants"
ON public.video_call_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM video_calls vc
    WHERE vc.id = video_call_participants.call_id
    AND (vc.host_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can update their own participation"
ON public.video_call_participants
FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can leave calls"
ON public.video_call_participants
FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));