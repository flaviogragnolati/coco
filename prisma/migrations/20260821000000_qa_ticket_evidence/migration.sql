CREATE TYPE "QaTicketEvidenceKind" AS ENUM ('image', 'consoleLog', 'networkLog');

CREATE TABLE "qa_ticket_evidence" (
    "id" SERIAL NOT NULL,
    "qaTicketId" INTEGER NOT NULL,
    "kind" "QaTicketEvidenceKind" NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_ticket_evidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "qa_ticket_evidence_slot_check" CHECK ("slot" BETWEEN 0 AND 4)
);

CREATE UNIQUE INDEX "qa_ticket_evidence_qaTicketId_kind_slot_key"
ON "qa_ticket_evidence"("qaTicketId", "kind", "slot");

CREATE INDEX "qa_ticket_evidence_qaTicketId_kind_idx"
ON "qa_ticket_evidence"("qaTicketId", "kind");

ALTER TABLE "qa_ticket_evidence"
ADD CONSTRAINT "qa_ticket_evidence_qaTicketId_fkey"
FOREIGN KEY ("qaTicketId") REFERENCES "qa_ticket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
