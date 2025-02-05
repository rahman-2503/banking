"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

// Create a new transaction
export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        channel: "online",
        category: "Transfer",
        ...transaction,
      }
    );

    return parseStringify(newTransaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    return { error: "Failed to create transaction" };
  }
};

// Get transactions by bank ID
export const getTransactionsByBankId = async ({ bankId }: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    // Fetch transactions where the bank is the sender
    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal("senderBankId", bankId)]
    );

    // Fetch transactions where the bank is the receiver
    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal("receiverBankId", bankId)]
    );

    // Merge both lists into a single array
    const transactions = [
      ...(senderTransactions?.documents || []), 
      ...(receiverTransactions?.documents || [])
    ];

    return parseStringify({
      total: transactions.length,
      documents: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions by bank ID:", error);
    return { total: 0, documents: [] };
  }
};
