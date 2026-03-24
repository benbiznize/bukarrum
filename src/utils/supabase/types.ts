export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          address?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          location_id: string;
          type: "room" | "equipment" | "service";
          name: string;
          description: string | null;
          photos: string[];
          hourly_rate: number;
          capacity: number | null;
          available_as_addon: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          type?: "room" | "equipment" | "service";
          name: string;
          description?: string | null;
          photos?: string[];
          hourly_rate: number;
          capacity?: number | null;
          available_as_addon?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string;
          type?: "room" | "equipment" | "service";
          name?: string;
          description?: string | null;
          photos?: string[];
          hourly_rate?: number;
          capacity?: number | null;
          available_as_addon?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      resource_addons: {
        Row: {
          resource_id: string;
          addon_resource_id: string;
        };
        Insert: {
          resource_id: string;
          addon_resource_id: string;
        };
        Update: {
          resource_id?: string;
          addon_resource_id?: string;
        };
        Relationships: [];
      };
      availability: {
        Row: {
          id: string;
          resource_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
        };
        Relationships: [];
      };
      booking_groups: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          booking_group_id: string | null;
          resource_id: string;
          location_id: string;
          business_id: string;
          client_name: string;
          client_email: string;
          client_phone: string | null;
          start_time: string;
          end_time: string;
          total_price: number;
          status: "pending" | "confirmed" | "cancelled";
          fintoc_payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_group_id?: string | null;
          resource_id: string;
          location_id: string;
          business_id: string;
          client_name: string;
          client_email: string;
          client_phone?: string | null;
          start_time: string;
          end_time: string;
          total_price: number;
          status?: "pending" | "confirmed" | "cancelled";
          fintoc_payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_group_id?: string | null;
          resource_id?: string;
          location_id?: string;
          business_id?: string;
          client_name?: string;
          client_email?: string;
          client_phone?: string | null;
          start_time?: string;
          end_time?: string;
          total_price?: number;
          status?: "pending" | "confirmed" | "cancelled";
          fintoc_payment_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled";
      resource_type: "room" | "equipment" | "service";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience types
export type Business     = Database["public"]["Tables"]["businesses"]["Row"];
export type Location     = Database["public"]["Tables"]["locations"]["Row"];
export type Resource     = Database["public"]["Tables"]["resources"]["Row"];
export type Availability = Database["public"]["Tables"]["availability"]["Row"];
export type BookingGroup = Database["public"]["Tables"]["booking_groups"]["Row"];
export type Booking      = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type ResourceType  = "room" | "equipment" | "service";
