// components\admin\users\users-table-skeleton.tsx
"use client"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function UsersTableSkeleton() {
  return (
    <div className="mt-2 space-y-4 pt-2">
      {/* Filters Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-md border bg-background">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead style={{ width: "28px" }} className="h-11">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead style={{ width: "250px" }} className="h-11">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead style={{ width: "100px" }} className="h-11">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead style={{ width: "120px" }} className="h-11">
                <Skeleton className="h-4 w-14" />
              </TableHead>
              <TableHead style={{ width: "120px" }} className="h-11">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead style={{ width: "120px" }} className="h-11">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead style={{ width: "60px" }} className="h-11">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  )
}
