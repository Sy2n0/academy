-- Add optional server connection metadata for playground challenges
ALTER TABLE "PlaygroundChallenge"
ADD COLUMN "serverAddress" TEXT,
ADD COLUMN "serverPort" INTEGER;
