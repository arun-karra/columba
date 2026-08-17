-- Add declined status for group invitations users can reject in-app.
ALTER TYPE "InviteStatus" ADD VALUE IF NOT EXISTS 'declined';
