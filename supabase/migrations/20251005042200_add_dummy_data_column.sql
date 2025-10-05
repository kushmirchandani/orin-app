-- Add dummy_data_enabled column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dummy_data_enabled BOOLEAN DEFAULT false;
