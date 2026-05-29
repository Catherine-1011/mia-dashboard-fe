import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download } from "lucide-react";

const invoices = [
  {
    id: "INV-001",
    customer: "Alice Johnson",
    amount: "$450",
    date: "2024-10-28",
    status: "Paid",
  },
  {
    id: "INV-002",
    customer: "Bob Smith",
    amount: "$85",
    date: "2024-10-27",
    status: "Pending",
  },
  {
    id: "INV-003",
    customer: "Carol Brown",
    amount: "$220",
    date: "2024-10-26",
    status: "Overdue",
  },
];

function getStatusBadge(status: string) {
  if (status === "Paid")
    return (
      <Badge
        className="bg-green-100 text-green-800"
        variant="outline"
      >
        Paid
      </Badge>
    );
  if (status === "Pending")
    return (
      <Badge
        className="bg-yellow-100 text-yellow-800"
        variant="outline"
      >
        Pending
      </Badge>
    );
  if (status === "Overdue")
    return (
      <Badge
        className="bg-red-100 text-red-800"
        variant="outline"
      >
        Overdue
      </Badge>
    );
  return <Badge variant="secondary">{status}</Badge>;
}

const InvoicePage = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.id}</TableCell>
                <TableCell>{inv.customer}</TableCell>
                <TableCell>{inv.amount}</TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell>{getStatusBadge(inv.status)}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default InvoicePage;
