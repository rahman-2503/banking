"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { createTransfer } from "@/lib/actions/dwolla.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";
import { getBank, getBankByAccountId } from "@/lib/actions/user.actions";
import { decryptId } from "@/lib/utils";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(4, "Amount is too short"),
  senderBank: z.string().min(4, "Please select a valid bank account"),
  sharableId: z.string().min(8, "Please select a valid sharable Id"),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: "",
      sharableId: "",
    },
  });

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const receiverAccountId = decryptId(data.sharableId);
      const receiverBank = await getBankByAccountId({
        accountId: receiverAccountId,
      });
      const senderBank = await getBank({ documentId: data.senderBank });

      const transferParams = {
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
        amount: data.amount,
      };
      // create transfer
      const transfer = await createTransfer(transferParams);

      // create transfer transaction
      if (transfer) {
        const transaction = {
          name: data.name,
          amount: data.amount,
          senderId: senderBank.userId.$id,
          senderBankId: senderBank.$id,
          receiverId: receiverBank.userId.$id,
          receiverBankId: receiverBank.$id,
          email: data.email,
        };

        const newTransaction = await createTransaction(transaction);

        if (newTransaction) {
          form.reset();
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Submitting create transfer request failed: ", error);
    }

    setIsLoading(false);
  };

  return (
    <div>
      {/* Bank Comparison Table */}
      <div className="bank-comparison">
        <h2 className="text-24 font-bold text-gray-900 mb-6">
          Why Choose Our Bank?
        </h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-4 text-left text-14 font-medium text-gray-700">
                Feature
              </th>
              <th className="p-4 text-left text-14 font-medium text-gray-700">
                Other Banks
              </th>
              <th className="p-4 text-left text-14 font-medium text-gray-700">
                Our Bank
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-4 text-14 text-gray-700">Transaction Speed</td>
              <td className="p-4 text-14 text-gray-600">1-3 Business Days</td>
              <td className="p-4 text-14 text-green-600 font-semibold">
                Instant
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-4 text-14 text-gray-700">Transaction Fees</td>
              <td className="p-4 text-14 text-gray-600">High Fees</td>
              <td className="p-4 text-14 text-green-600 font-semibold">
                0 Fees
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="p-4 text-14 text-gray-700">Taxes</td>
              <td className="p-4 text-14 text-gray-600">Additional Taxes</td>
              <td className="p-4 text-14 text-green-600 font-semibold">
                No Taxes
              </td>
            </tr>
            <tr>
              <td className="p-4 text-14 text-gray-700">Customer Support</td>
              <td className="p-4 text-14 text-gray-600">Limited Support</td>
              <td className="p-4 text-14 text-green-600 font-semibold">
                24/7 Support
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Existing Payment Transfer Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
          <FormField
            control={form.control}
            name="senderBank"
            render={() => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item pb-6 pt-5">
                  <div className="payment-transfer_form-content">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Select Source Bank
                    </FormLabel>
                    <FormDescription className="text-12 font-normal text-gray-600">
                      Select the bank account you want to transfer funds from
                    </FormDescription>
                  </div>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <BankDropdown
                        accounts={accounts}
                        setValue={form.setValue}
                        otherStyles="!w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item pb-6 pt-5">
                  <div className="payment-transfer_form-content">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Transfer Note (Optional)
                    </FormLabel>
                    <FormDescription className="text-12 font-normal text-gray-600">
                      Please provide any additional information or instructions
                      related to the transfer
                    </FormDescription>
                  </div>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Textarea
                        placeholder="Write a short note here"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <div className="payment-transfer_form-details">
            <h2 className="text-18 font-semibold text-gray-900">
              Bank account details
            </h2>
            <p className="text-16 font-normal text-gray-600">
              Enter the bank account details of the recipient
            </p>
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item py-5">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Recipient&apos;s Email Address
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Input
                        placeholder="ex: johndoe@gmail.com"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sharableId"
            render={({ field }) => (
              <FormItem className="border-t border-gray-200">
                <div className="payment-transfer_form-item pb-5 pt-6">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Receiver&apos;s Plaid Sharable Id
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Input
                        placeholder="Enter the public account number"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="border-y border-gray-200">
                <div className="payment-transfer_form-item py-5">
                  <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                    Amount
                  </FormLabel>
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <Input
                        placeholder="ex: 5.00"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-12 text-red-500" />
                  </div>
                </div>
              </FormItem>
            )}
          />

          <div className="payment-transfer_btn-box">
            <Button type="submit" className="payment-transfer_btn">
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> &nbsp; Sending...
                </>
              ) : (
                "Transfer Funds"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PaymentTransferForm;
