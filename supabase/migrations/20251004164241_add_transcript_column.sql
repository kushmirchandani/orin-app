-- Add transcript and processing status to dumps table
ALTER TABLE dumps
ADD COLUMN transcript TEXT,
ADD COLUMN processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Create index for faster queries on processing status
CREATE INDEX idx_dumps_processing_status ON dumps(processing_status);

-- Add comment for clarity
COMMENT ON COLUMN dumps.transcript IS 'AI-generated transcript of voice recordings';
COMMENT ON COLUMN dumps.processing_status IS 'Status of transcription: pending, processing, completed, or failed';
