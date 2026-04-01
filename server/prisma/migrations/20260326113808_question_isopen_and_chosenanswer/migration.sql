-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "chosenAnswerId" TEXT,
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_chosenAnswerId_fkey" FOREIGN KEY ("chosenAnswerId") REFERENCES "Answer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
