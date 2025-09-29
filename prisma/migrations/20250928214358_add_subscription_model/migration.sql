-- CreateTable
CREATE TABLE "public"."Subscription" (
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("userId","communityId")
);
