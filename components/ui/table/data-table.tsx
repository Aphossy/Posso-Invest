// C:\Users\user\OneDrive\Desktop\trustlink-group\components\ui\table\data-table.tsx
"use client"

import type React from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  FilterIcon,
  RefreshCw,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Generic filter function type
export type CustomFilterFn<T> = FilterFn<T>

// Filter configuration for dropdowns
export interface FilterConfig {
  columnId: string
  label: string
  options: Array<{
    value: string
    label: string
    count?: number
  }>
}

// Action configuration
export interface ActionConfig<T> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (selectedItems: T[], filteredItems: T[]) => void
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
  requiresSelection?: boolean
}

// Main props interface
export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  searchPlaceholder?: string
  searchColumnId?: string
  filterConfigs?: FilterConfig[]
  actions?: ActionConfig<T>[]
  onRefresh?: () => void
  onRowClick?: (item: T) => void
  enableSelection?: boolean
  enableBulkDelete?: boolean
  onBulkDelete?: (items: T[]) => void
  bulkDeleteConfirmText?: (count: number) => string
  emptyMessage?: string
  pageSizeOptions?: number[]
  defaultPageSize?: number
  defaultSorting?: SortingState
  SkeletonComponent?: React.ComponentType
  onDateRangeChange?: (dateRange: DateRange | undefined) => void
  dateRange?: DateRange
  searchValue?: string
  onSearchChange?: (search: string) => void
  statusFilter?: string[]
  onStatusFilterChange?: (values: string[]) => void
  bookingTypeFilter?: string[]
  onBookingTypeFilterChange?: (values: string[]) => void
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Search...",
  searchColumnId,
  filterConfigs = [],
  actions = [],
  onRefresh,
  onRowClick,
  enableSelection = false,
  enableBulkDelete = false,
  onBulkDelete,
  bulkDeleteConfirmText = (count) => `DELETE ${count} ITEMS`,
  emptyMessage = "No data found.",
  pageSizeOptions = [5, 10, 25, 50],
  defaultPageSize = 10,
  defaultSorting = [],
  SkeletonComponent,
  onDateRangeChange,
  dateRange,
  searchValue,
  onSearchChange,
  statusFilter = [],
  onStatusFilterChange,
  bookingTypeFilter = [],
  onBookingTypeFilterChange,
}: DataTableProps<T>) {
  const id = useId()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })
  const [refreshing, setRefreshing] = useState(false)
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)
  const inputRef = useRef<HTMLInputElement>(null)

  // Add selection column if enabled
  const finalColumns = useMemo(() => {
    if (!enableSelection) return columns

    const selectionColumn: ColumnDef<T> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 28,
      enableSorting: false,
      enableHiding: false,
    }

    return [selectionColumn, ...columns]
  }, [columns, enableSelection])

  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
  })

  useEffect(() => {
    if (searchColumnId && searchValue !== undefined) {
      table.getColumn(searchColumnId)?.setFilterValue(searchValue)
    }
  }, [searchValue, searchColumnId, table])

  const handleRefresh = async () => {
    if (!onRefresh) return

    setRefreshing(true)
    try {
      await onRefresh()
    } catch (error) {
      console.error("failed to refresh data", error)
      toast.error("Failed to refresh data")
    } finally {
      setRefreshing(false)
    }
  }

  const handleBulkDelete = () => {
    if (!onBulkDelete) return

    const selectedRows = table.getSelectedRowModel().rows
    const selectedItems = selectedRows.map((row) => row.original)
    onBulkDelete(selectedItems)
    table.resetRowSelection()
  }

  const handleFilterChange = (columnId: string, value: string) => {
    if (columnId === "status" && onStatusFilterChange) {
      if (value === "all") {
        table.getColumn(columnId)?.setFilterValue(undefined)
        onStatusFilterChange([])
        return
      }

      const currentValues = statusFilter || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value]

      table
        .getColumn(columnId)
        ?.setFilterValue(newValues.length > 0 ? newValues : undefined)
      onStatusFilterChange(newValues)
      return
    }

    if (columnId === "bookingType" && onBookingTypeFilterChange) {
      if (value === "all") {
        table.getColumn(columnId)?.setFilterValue(undefined)
        onBookingTypeFilterChange([])
        return
      }

      const currentValues = bookingTypeFilter || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value]

      table
        .getColumn(columnId)
        ?.setFilterValue(newValues.length > 0 ? newValues : undefined)
      onBookingTypeFilterChange(newValues)
      return
    }

    // Fallback to original behavior for other filters
    const currentFilter = table.getColumn(columnId)?.getFilterValue() as
      | string[]
      | undefined

    if (value === "all") {
      table.getColumn(columnId)?.setFilterValue(undefined)
    } else {
      const currentValues = currentFilter || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value]

      table
        .getColumn(columnId)
        ?.setFilterValue(newValues.length > 0 ? newValues : undefined)
    }
  }

  if (loading && SkeletonComponent) {
    return <SkeletonComponent />
  }

  const selectedItems = table
    .getSelectedRowModel()
    .rows.map((row) => row.original)
  const selectedCount = selectedItems.length

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          {searchColumnId && (
            <div className="relative">
              <Input
                id={`${id}-input`}
                ref={inputRef}
                className={cn(
                  "peer min-w-50 ps-9",
                  Boolean(searchValue) && "pe-9"
                )}
                value={searchValue || ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                type="text"
                aria-label={searchPlaceholder}
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
                <SearchIcon size={16} aria-hidden="true" />
              </div>
              {Boolean(searchValue) && (
                <button
                  className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear filter"
                  onClick={() => {
                    onSearchChange?.("")
                    if (inputRef.current) {
                      inputRef.current.focus()
                    }
                  }}>
                  <CircleXIcon size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Filter Dropdowns */}
          {filterConfigs.map((filterConfig) => {
            let selectedValues: string[] = []
            if (filterConfig.columnId === "status" && onStatusFilterChange) {
              selectedValues = statusFilter
            } else if (
              filterConfig.columnId === "bookingType" &&
              onBookingTypeFilterChange
            ) {
              selectedValues = bookingTypeFilter
            } else {
              selectedValues =
                (table
                  .getColumn(filterConfig.columnId)
                  ?.getFilterValue() as string[]) ?? []
            }

            const selectedCount = selectedValues.length

            return (
              <Popover key={filterConfig.columnId}>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <FilterIcon
                      className="-ms-1 opacity-60"
                      size={16}
                      aria-hidden="true"
                    />
                    {filterConfig.label}
                    {selectedCount > 0 && (
                      <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                        {selectedCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto min-w-36 p-3" align="start">
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Filter by {filterConfig.label}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedCount === 0}
                          onCheckedChange={() =>
                            handleFilterChange(filterConfig.columnId, "all")
                          }
                          id={`${id}-${filterConfig.columnId}-all`}
                        />
                        <Label
                          htmlFor={`${id}-${filterConfig.columnId}-all`}
                          className="flex grow justify-between gap-2 font-normal">
                          All
                          <span className="ms-2 text-xs text-muted-foreground">
                            {filterConfig.options.reduce(
                              (sum, option) => sum + (option.count || 0),
                              0
                            )}
                          </span>
                        </Label>
                      </div>
                      {filterConfig.options.map((option, i) => (
                        <div
                          key={option.value}
                          className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedValues.includes(option.value)}
                            onCheckedChange={() =>
                              handleFilterChange(
                                filterConfig.columnId,
                                option.value
                              )
                            }
                            id={`${id}-${filterConfig.columnId}-${i}`}
                          />
                          <Label
                            htmlFor={`${id}-${filterConfig.columnId}-${i}`}
                            className="flex grow justify-between gap-2 font-normal capitalize">
                            {option.label}
                            {option.count !== undefined && (
                              <span className="ms-2 text-xs text-muted-foreground">
                                {option.count}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}

          {/* Date Range Filter */}
          {onDateRangeChange && (
            <DateRangePicker
              initialDateFrom={dateRange?.from}
              initialDateTo={dateRange?.to}
              onUpdate={({ range }) => onDateRangeChange(range)}
              align="start"
              showCompare={false}
            />
          )}

          {/* Column Visibility Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3Icon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(event) => event.preventDefault()}>
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}>
              <RefreshCw
                className={cn("-ms-1 opacity-60", refreshing && "animate-spin")}
                size={16}
                aria-hidden="true"
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}

          {/* Custom Actions */}
          {actions.map((action, index) => {
            const shouldShow = !action.requiresSelection || selectedCount > 0
            if (!shouldShow) return null

            const ActionIcon = action.icon
            const filteredItems = table
              .getFilteredRowModel()
              .rows.map((row) => row.original)

            return (
              <Button
                key={index}
                variant={action.variant || "outline"}
                onClick={() => action.onClick(selectedItems, filteredItems)}
                disabled={action.requiresSelection && selectedCount === 0}>
                {ActionIcon && (
                  <ActionIcon className="-ms-1 opacity-60" aria-hidden="true" />
                )}
                {action.label}
                {action.requiresSelection && selectedCount > 0 && (
                  <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                    {selectedCount}
                  </span>
                )}
              </Button>
            )
          })}

          {/* Bulk Delete */}
          {enableBulkDelete && selectedCount > 0 && (
            <BulkDeleteDialog
              selectedCount={selectedCount}
              onConfirm={handleBulkDelete}
              confirmText={bulkDeleteConfirmText(selectedCount)}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border bg-background">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="h-11">
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            header.column.getCanSort() &&
                              "flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (
                              header.column.getCanSort() &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault()
                              header.column.getToggleSortingHandler()?.(e)
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: (
                              <ChevronUpIcon
                                className="shrink-0 opacity-60"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                            desc: (
                              <ChevronDownIcon
                                className="shrink-0 opacity-60"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(event) => {
                    const target = event.target as HTMLElement | null
                    if (target?.closest('[data-row-click-ignore="true"]')) {
                      return
                    }
                    onRowClick?.(row.original)
                  }}
                  className={cn(onRowClick && "cursor-pointer")}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="last:py-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={finalColumns.length}
                  className="h-24 text-center">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CircleAlertIcon
                          className="opacity-50"
                          size={32}
                          aria-hidden="true"
                        />
                      </EmptyMedia>
                      <EmptyTitle>{emptyMessage}</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <EmptyDescription>
                        We couldn't find any results. You may try to adjusting
                        your filters or search criteria.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-8">
        {/* Results per page */}
        <div className="flex items-center gap-3">
          <Label htmlFor={id} className="max-sm:sr-only">
            Rows per page
          </Label>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}>
            <SelectTrigger id={id} className="w-fit whitespace-nowrap">
              <SelectValue placeholder="Select number of results" />
            </SelectTrigger>
            <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page number information */}
        <div className="flex grow justify-end text-sm whitespace-nowrap text-muted-foreground">
          <p
            className="text-sm whitespace-nowrap text-muted-foreground"
            aria-live="polite">
            <span className="text-foreground">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              -
              {Math.min(
                Math.max(
                  table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    table.getState().pagination.pageSize,
                  0
                ),
                table.getRowCount()
              )}
            </span>{" "}
            of{" "}
            <span className="text-foreground">
              {table.getRowCount().toString()}
            </span>
          </p>
        </div>

        {/* Pagination buttons */}
        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-transparent disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to first page">
                  <ChevronFirstIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-transparent disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to previous page">
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-transparent disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to next page">
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-transparent disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to last page">
                  <ChevronLastIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}

function BulkDeleteDialog({
  selectedCount,
  onConfirm,
  confirmText,
}: {
  selectedCount: number
  onConfirm: () => void
  confirmText: string
}) {
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const isDeleteEnabled = deleteConfirm === confirmText

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="ml-auto bg-transparent" variant="outline">
          <TrashIcon
            className="-ms-1 opacity-60"
            size={16}
            aria-hidden="true"
          />
          Delete
          <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
            {selectedCount}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true">
            <CircleAlertIcon className="opacity-80" size={16} />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete {selectedCount} items?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2">
              This action cannot be undone. This will permanently delete{" "}
              {selectedCount} selected {selectedCount === 1 ? "item" : "items"}.
              <span className="pl-3">
                Please type <strong>{confirmText}</strong> to confirm.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <div className="mt-2">
          <Input
            type="text"
            className="border-gray-5 w-full"
            placeholder={confirmText}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-slate-700 text-white hover:bg-slate-800 hover:text-white dark:bg-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => setDeleteConfirm("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              setDeleteConfirm("")
            }}
            className={`bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:text-white dark:hover:bg-red-600 ${
              !isDeleteEnabled ? "cursor-not-allowed opacity-50" : ""
            }`}
            disabled={!isDeleteEnabled}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
