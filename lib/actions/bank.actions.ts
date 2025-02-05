"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // Get banks from db
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
      return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
    }

    const accounts = await Promise.all(
      banks.map(async (bank: Bank) => {
        try {
          // Get each account info from Plaid
          const accountsResponse = await plaidClient.accountsGet({
            access_token: bank.accessToken,
          });

          if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length === 0) {
            return null;
          }

          const accountData = accountsResponse.data.accounts[0];

          // Get institution info from Plaid
          const institution = await getInstitution({
            institutionId: accountsResponse.data.item.institution_id!,
          });

          return {
            id: accountData.account_id,
            availableBalance: accountData.balances.available ?? 0,
            currentBalance: accountData.balances.current ?? 0,
            institutionId: institution?.institution_id || "Unknown",
            name: accountData.name,
            officialName: accountData.official_name || "N/A",
            mask: accountData.mask || "",
            type: accountData.type as string,
            subtype: accountData.subtype as string,
            appwriteItemId: bank.$id,
            shareableId: bank.shareableId,
          };
        } catch (err) {
          console.error("Error fetching account info:", err);
          return null;
        }
      })
    );

    const filteredAccounts = accounts.filter((acc) => acc !== null);

    const totalBanks = filteredAccounts.length;
    const totalCurrentBalance = filteredAccounts.reduce((total, account) => {
      return total + (account?.currentBalance ?? 0);
    }, 0);

    return parseStringify({ data: filteredAccounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    return null;
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    // Get bank from db
    const bank = await getBank({ documentId: appwriteItemId });

    if (!bank) throw new Error("Bank not found");

    // Get account info from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });

    if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length === 0) {
      throw new Error("No accounts found for the given bank.");
    }

    const accountData = accountsResponse.data.accounts[0];

    // Get transactions from appwrite
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    const transferTransactions = (transferTransactionsData?.documents || []).map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name || "N/A",
        amount: transferData.amount || 0,
        date: transferData.$createdAt || new Date().toISOString(),
        paymentChannel: transferData.channel || "Unknown",
        category: transferData.category || "Other",
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
      })
    );

    // Get institution info from Plaid
    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    // Get transactions from Plaid
    const transactions = await getTransactions({
      accessToken: bank.accessToken,
    });

    // Sort transactions by date (most recent first)
    const allTransactions = [...transactions, ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available ?? 0,
      currentBalance: accountData.balances.current ?? 0,
      institutionId: institution?.institution_id || "Unknown",
      name: accountData.name,
      officialName: accountData.official_name || "N/A",
      mask: accountData.mask || "",
      type: accountData.type as string,
      subtype: accountData.subtype as string,
      appwriteItemId: bank.$id,
    };

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
    return null;
  }
};

// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    return parseStringify(institutionResponse?.data?.institution || {});
  } catch (error) {
    console.error("An error occurred while getting the institution:", error);
    return null;
  }
};

// Get transactions
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let transactions: any[] = [];

  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });

      const data = response.data;

      transactions.push(
        ...data.added.map((transaction) => ({
          id: transaction.transaction_id,
          name: transaction.name || "Unknown",
          paymentChannel: transaction.payment_channel || "N/A",
          type: transaction.payment_channel || "Unknown",
          accountId: transaction.account_id,
          amount: transaction.amount || 0,
          pending: transaction.pending,
          category: transaction.category ? transaction.category[0] : "Other",
          date: transaction.date || new Date().toISOString(),
          image: transaction.logo_url || "",
        }))
      );

      hasMore = data.has_more;
    }

    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting transactions:", error);
    return [];
  }
};
