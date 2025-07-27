/**
 * UI-specific type definitions
 */

export interface FormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface FilterOptions {
  searchTerm?: string;
  status?: string;
  industry?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface NotificationProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export interface WidgetCustomization {
  primaryColor: string;
  secondaryColor: string;
  borderRadius: number;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size: "small" | "medium" | "large";
  autoOpen: boolean;
  showBranding: boolean;
}