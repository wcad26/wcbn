export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      attendance_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          day_index: number | null
          dcg_id: string | null
          description: string | null
          event_date: string
          id: string
          name: string
          parent_event_id: string | null
          region_id: string | null
          source_event_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          day_index?: number | null
          dcg_id?: string | null
          description?: string | null
          event_date: string
          id?: string
          name: string
          parent_event_id?: string | null
          region_id?: string | null
          source_event_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          day_index?: number | null
          dcg_id?: string | null
          description?: string | null
          event_date?: string
          id?: string
          name?: string
          parent_event_id?: string | null
          region_id?: string | null
          source_event_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_dcg_id_fkey"
            columns: ["dcg_id"]
            isOneToOne: false
            referencedRelation: "dcgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          event_id: string
          id: string
          is_present: boolean | null
          member_id: string
          recorded_at: string | null
          recorded_by: string | null
        }
        Insert: {
          event_id: string
          id?: string
          is_present?: boolean | null
          member_id: string
          recorded_at?: string | null
          recorded_by?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          is_present?: boolean | null
          member_id?: string
          recorded_at?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "attendance_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      backfill_auth_users_report: {
        Row: {
          action: string
          email: string | null
          id: string
          note: string | null
          profile_id: string | null
          run_at: string
        }
        Insert: {
          action: string
          email?: string | null
          id?: string
          note?: string | null
          profile_id?: string | null
          run_at?: string
        }
        Update: {
          action?: string
          email?: string | null
          id?: string
          note?: string | null
          profile_id?: string | null
          run_at?: string
        }
        Relationships: []
      }
      bible_books: {
        Row: {
          abbreviation: string
          book_number: number
          chapters_count: number
          created_at: string | null
          id: string
          name: string
          name_fr: string | null
          testament: string
        }
        Insert: {
          abbreviation: string
          book_number: number
          chapters_count: number
          created_at?: string | null
          id?: string
          name: string
          name_fr?: string | null
          testament: string
        }
        Update: {
          abbreviation?: string
          book_number?: number
          chapters_count?: number
          created_at?: string | null
          id?: string
          name?: string
          name_fr?: string | null
          testament?: string
        }
        Relationships: []
      }
      bible_verses: {
        Row: {
          book_number: number
          chapter: number
          created_at: string | null
          id: string
          text: string
          verse: number
          version_id: string
        }
        Insert: {
          book_number: number
          chapter: number
          created_at?: string | null
          id?: string
          text: string
          verse: number
          version_id: string
        }
        Update: {
          book_number?: number
          chapter?: number
          created_at?: string | null
          id?: string
          text?: string
          verse?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_verses_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_versions: {
        Row: {
          api_id: string | null
          code: string
          copyright_info: string | null
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_stored: boolean
          language: string
          name: string
        }
        Insert: {
          api_id?: string | null
          code: string
          copyright_info?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_stored?: boolean
          language?: string
          name: string
        }
        Update: {
          api_id?: string | null
          code?: string
          copyright_info?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_stored?: boolean
          language?: string
          name?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          additional_fields: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name_position: Json | null
          output_type: string
          qr_position: Json | null
          region_id: string | null
          template_name: string
          template_type: string
          template_url: string
        }
        Insert: {
          additional_fields?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name_position?: Json | null
          output_type?: string
          qr_position?: Json | null
          region_id?: string | null
          template_name: string
          template_type: string
          template_url: string
        }
        Update: {
          additional_fields?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name_position?: Json | null
          output_type?: string
          qr_position?: Json | null
          region_id?: string | null
          template_name?: string
          template_type?: string
          template_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          certificate_type: string
          certificate_url: string
          created_at: string | null
          email_delivery_details: Json | null
          email_last_status_update: string | null
          email_sent_at: string | null
          email_status:
            | Database["public"]["Enums"]["email_delivery_status"]
            | null
          event_date: string | null
          event_name: string | null
          id: string
          is_active: boolean | null
          issued_by: string | null
          issued_date: string
          member_id: string | null
          output_type: string
          pre_registration_id: string | null
          qr_code_data: string | null
          recipient_email: string | null
          recipient_name: string
          region_id: string
          resend_email_id: string | null
          updated_at: string | null
          verification_code: string
        }
        Insert: {
          certificate_number: string
          certificate_type: string
          certificate_url: string
          created_at?: string | null
          email_delivery_details?: Json | null
          email_last_status_update?: string | null
          email_sent_at?: string | null
          email_status?:
            | Database["public"]["Enums"]["email_delivery_status"]
            | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          issued_date?: string
          member_id?: string | null
          output_type?: string
          pre_registration_id?: string | null
          qr_code_data?: string | null
          recipient_email?: string | null
          recipient_name: string
          region_id: string
          resend_email_id?: string | null
          updated_at?: string | null
          verification_code: string
        }
        Update: {
          certificate_number?: string
          certificate_type?: string
          certificate_url?: string
          created_at?: string | null
          email_delivery_details?: Json | null
          email_last_status_update?: string | null
          email_sent_at?: string | null
          email_status?:
            | Database["public"]["Enums"]["email_delivery_status"]
            | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          issued_date?: string
          member_id?: string | null
          output_type?: string
          pre_registration_id?: string | null
          qr_code_data?: string | null
          recipient_email?: string | null
          recipient_name?: string
          region_id?: string
          resend_email_id?: string | null
          updated_at?: string | null
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_pre_registration_id_fkey"
            columns: ["pre_registration_id"]
            isOneToOne: false
            referencedRelation: "event_pre_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          region_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          region_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          region_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          audience: string
          channels: string[]
          content: string
          created_at: string
          created_by: string | null
          id: string
          message_type:
            | Database["public"]["Enums"]["communication_message_type"]
            | null
          region_id: string
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          title: string
          updated_at: string
        }
        Insert: {
          audience: string
          channels: string[]
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          message_type?:
            | Database["public"]["Enums"]["communication_message_type"]
            | null
          region_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          channels?: string[]
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message_type?:
            | Database["public"]["Enums"]["communication_message_type"]
            | null
          region_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          decimal_places: number | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          decimal_places?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          decimal_places?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dcg_members: {
        Row: {
          created_at: string
          dcg_id: string
          id: string
          is_active: boolean
          joined_date: string
          member_id: string
          role: Database["public"]["Enums"]["dcg_member_role"]
        }
        Insert: {
          created_at?: string
          dcg_id: string
          id?: string
          is_active?: boolean
          joined_date?: string
          member_id: string
          role?: Database["public"]["Enums"]["dcg_member_role"]
        }
        Update: {
          created_at?: string
          dcg_id?: string
          id?: string
          is_active?: boolean
          joined_date?: string
          member_id?: string
          role?: Database["public"]["Enums"]["dcg_member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "dcg_members_dcg_id_fkey"
            columns: ["dcg_id"]
            isOneToOne: false
            referencedRelation: "dcgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dcg_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      dcg_user_sessions: {
        Row: {
          created_at: string | null
          dcg_id: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dcg_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dcg_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dcg_user_sessions_dcg_id_fkey"
            columns: ["dcg_id"]
            isOneToOne: false
            referencedRelation: "dcgs"
            referencedColumns: ["id"]
          },
        ]
      }
      dcgs: {
        Row: {
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          leader_id: string | null
          location: string | null
          meeting_day: string | null
          meeting_time: string | null
          name: string
          region_id: string
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string | null
          location?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          name: string
          region_id: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          leader_id?: string | null
          location?: string | null
          meeting_day?: string | null
          meeting_time?: string | null
          name?: string
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dcgs_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dcgs_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      discipleship_progress: {
        Row: {
          achieved_date: string | null
          created_at: string | null
          id: string
          milestone: Database["public"]["Enums"]["discipleship_milestone"]
          notes: string | null
          recorded_by: string | null
          relationship_id: string
        }
        Insert: {
          achieved_date?: string | null
          created_at?: string | null
          id?: string
          milestone: Database["public"]["Enums"]["discipleship_milestone"]
          notes?: string | null
          recorded_by?: string | null
          relationship_id: string
        }
        Update: {
          achieved_date?: string | null
          created_at?: string | null
          id?: string
          milestone?: Database["public"]["Enums"]["discipleship_milestone"]
          notes?: string | null
          recorded_by?: string | null
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipleship_progress_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipleship_progress_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "discipleship_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      discipleship_relationships: {
        Row: {
          created_at: string | null
          disciple_id: string
          end_date: string | null
          id: string
          mentor_id: string
          notes: string | null
          region_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["discipleship_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disciple_id: string
          end_date?: string | null
          id?: string
          mentor_id: string
          notes?: string | null
          region_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["discipleship_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disciple_id?: string
          end_date?: string | null
          id?: string
          mentor_id?: string
          notes?: string | null
          region_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["discipleship_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discipleship_relationships_disciple_id_fkey"
            columns: ["disciple_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipleship_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipleship_relationships_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          region_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          region_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          region_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_faqs: {
        Row: {
          answer: string
          answer_fr: string | null
          created_at: string | null
          display_order: number | null
          event_id: string
          id: string
          question: string
          question_fr: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          answer_fr?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          question: string
          question_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          answer_fr?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          question?: string
          question_fr?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_faqs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          challenges: string | null
          children_management_rating: number | null
          communication_rating: number | null
          created_at: string
          enjoyed_most: string[]
          enjoyed_most_other: string | null
          event_id: string
          fellowship: string | null
          first_time_attending: boolean | null
          food_rating: number | null
          future_topics: string | null
          id: string
          impactful_sessions: string | null
          kids_attended: boolean | null
          kids_care_rating: number | null
          kids_comprehension_rating: number | null
          kids_daily_attendance: string | null
          kids_meals_rating: number | null
          kids_remarks: string | null
          lodging_rating: number | null
          member_id: string | null
          overall_rating: number | null
          profile_id: string | null
          schedule_feedback: string | null
          submitted_at: string
          suggestions: string | null
          teaching_impact: string | null
          updated_at: string
        }
        Insert: {
          challenges?: string | null
          children_management_rating?: number | null
          communication_rating?: number | null
          created_at?: string
          enjoyed_most?: string[]
          enjoyed_most_other?: string | null
          event_id: string
          fellowship?: string | null
          first_time_attending?: boolean | null
          food_rating?: number | null
          future_topics?: string | null
          id?: string
          impactful_sessions?: string | null
          kids_attended?: boolean | null
          kids_care_rating?: number | null
          kids_comprehension_rating?: number | null
          kids_daily_attendance?: string | null
          kids_meals_rating?: number | null
          kids_remarks?: string | null
          lodging_rating?: number | null
          member_id?: string | null
          overall_rating?: number | null
          profile_id?: string | null
          schedule_feedback?: string | null
          submitted_at?: string
          suggestions?: string | null
          teaching_impact?: string | null
          updated_at?: string
        }
        Update: {
          challenges?: string | null
          children_management_rating?: number | null
          communication_rating?: number | null
          created_at?: string
          enjoyed_most?: string[]
          enjoyed_most_other?: string | null
          event_id?: string
          fellowship?: string | null
          first_time_attending?: boolean | null
          food_rating?: number | null
          future_topics?: string | null
          id?: string
          impactful_sessions?: string | null
          kids_attended?: boolean | null
          kids_care_rating?: number | null
          kids_comprehension_rating?: number | null
          kids_daily_attendance?: string | null
          kids_meals_rating?: number | null
          kids_remarks?: string | null
          lodging_rating?: number | null
          member_id?: string | null
          overall_rating?: number | null
          profile_id?: string | null
          schedule_feedback?: string | null
          submitted_at?: string
          suggestions?: string | null
          teaching_impact?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          event_id: string
          id: string
          image_url: string
          image_url_fr: string | null
          is_hero_image: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          image_url: string
          image_url_fr?: string | null
          is_hero_image?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          image_url?: string
          image_url_fr?: string | null
          is_hero_image?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_pre_registrations: {
        Row: {
          arrival_date: string | null
          attending_with_family: boolean
          created_at: string
          departure_date: string | null
          dietary_notes: string | null
          email: string
          event_id: string
          group_id: string | null
          has_children: boolean
          id: string
          is_primary: boolean
          lodging_party_size: number | null
          meal_preferences: string[] | null
          member_id: string
          needs_lodging: boolean
          phone: string | null
          pledge_amount: number | null
          pledge_currency_code: string | null
          pledge_status: string | null
          registration_type: string
        }
        Insert: {
          arrival_date?: string | null
          attending_with_family?: boolean
          created_at?: string
          departure_date?: string | null
          dietary_notes?: string | null
          email: string
          event_id: string
          group_id?: string | null
          has_children?: boolean
          id?: string
          is_primary?: boolean
          lodging_party_size?: number | null
          meal_preferences?: string[] | null
          member_id: string
          needs_lodging?: boolean
          phone?: string | null
          pledge_amount?: number | null
          pledge_currency_code?: string | null
          pledge_status?: string | null
          registration_type: string
        }
        Update: {
          arrival_date?: string | null
          attending_with_family?: boolean
          created_at?: string
          departure_date?: string | null
          dietary_notes?: string | null
          email?: string
          event_id?: string
          group_id?: string | null
          has_children?: boolean
          id?: string
          is_primary?: boolean
          lodging_party_size?: number | null
          meal_preferences?: string[] | null
          member_id?: string
          needs_lodging?: boolean
          phone?: string | null
          pledge_amount?: number | null
          pledge_currency_code?: string | null
          pledge_status?: string | null
          registration_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_pre_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_pre_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_recurrence_rules: {
        Row: {
          created_at: string
          created_by: string | null
          days_of_week: number[]
          dcg_id: string | null
          duration_minutes: number
          end_date: string | null
          frequency: string
          id: string
          interval_count: number
          is_active: boolean
          last_generated_until: string | null
          lead_time_days: number
          name: string
          region_id: string | null
          start_time: string
          template_event_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          dcg_id?: string | null
          duration_minutes?: number
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          last_generated_until?: string | null
          lead_time_days?: number
          name: string
          region_id?: string | null
          start_time?: string
          template_event_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_of_week?: number[]
          dcg_id?: string | null
          duration_minutes?: number
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          last_generated_until?: string | null
          lead_time_days?: number
          name?: string
          region_id?: string | null
          start_time?: string
          template_event_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_recurrence_rules_dcg_id_fkey"
            columns: ["dcg_id"]
            isOneToOne: false
            referencedRelation: "dcgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_recurrence_rules_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_recurrence_rules_template_event_id_fkey"
            columns: ["template_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_slug_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          event_id: string
          id: string
          old_slug: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          event_id: string
          id?: string
          old_slug: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          event_id?: string
          id?: string
          old_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_slug_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_speakers: {
        Row: {
          bio: string | null
          bio_fr: string | null
          created_at: string | null
          display_order: number | null
          event_id: string
          id: string
          linkedin_url: string | null
          name: string
          name_fr: string | null
          photo_url: string | null
          title: string
          title_fr: string | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          bio_fr?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          linkedin_url?: string | null
          name: string
          name_fr?: string | null
          photo_url?: string | null
          title: string
          title_fr?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          bio_fr?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          linkedin_url?: string | null
          name?: string
          name_fr?: string | null
          photo_url?: string | null
          title?: string
          title_fr?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_speakers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_testimonials: {
        Row: {
          content: string
          content_fr: string | null
          created_at: string | null
          display_order: number | null
          event_id: string
          id: string
          member_id: string | null
          name: string
          name_fr: string | null
          rating: number | null
          role: string
          role_fr: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          content_fr?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          member_id?: string | null
          name: string
          name_fr?: string | null
          rating?: number | null
          role: string
          role_fr?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_fr?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          member_id?: string | null
          name?: string
          name_fr?: string | null
          rating?: number | null
          role?: string
          role_fr?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_testimonials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_testimonials_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          address_fr: string | null
          attendance_target: number | null
          capacity: number | null
          category: Database["public"]["Enums"]["event_category"] | null
          collect_lodging: boolean
          collect_meal_preferences: boolean
          collect_pledges: boolean
          cost: number | null
          cost_currency_code: string | null
          created_at: string
          created_by: string | null
          dcg_id: string | null
          description: string | null
          description_fr: string | null
          detached_from_series: boolean
          end_datetime: string | null
          id: string
          image_url: string | null
          image_url_fr: string | null
          is_featured: boolean
          is_public: boolean
          is_recurring_instance: boolean
          is_special: boolean | null
          linked_fundraising_campaign_id: string | null
          location_name: string | null
          location_name_fr: string | null
          name: string
          name_fr: string | null
          organizer_email: string | null
          organizer_name: string | null
          organizer_phone: string | null
          recurrence_rule_id: string | null
          region_id: string | null
          registration_url: string | null
          requirements: string | null
          requirements_fr: string | null
          requires_pre_registration: boolean
          slug: string | null
          start_datetime: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          whatsapp_contact: string | null
        }
        Insert: {
          address?: string | null
          address_fr?: string | null
          attendance_target?: number | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"] | null
          collect_lodging?: boolean
          collect_meal_preferences?: boolean
          collect_pledges?: boolean
          cost?: number | null
          cost_currency_code?: string | null
          created_at?: string
          created_by?: string | null
          dcg_id?: string | null
          description?: string | null
          description_fr?: string | null
          detached_from_series?: boolean
          end_datetime?: string | null
          id?: string
          image_url?: string | null
          image_url_fr?: string | null
          is_featured?: boolean
          is_public?: boolean
          is_recurring_instance?: boolean
          is_special?: boolean | null
          linked_fundraising_campaign_id?: string | null
          location_name?: string | null
          location_name_fr?: string | null
          name: string
          name_fr?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          organizer_phone?: string | null
          recurrence_rule_id?: string | null
          region_id?: string | null
          registration_url?: string | null
          requirements?: string | null
          requirements_fr?: string | null
          requires_pre_registration?: boolean
          slug?: string | null
          start_datetime: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          whatsapp_contact?: string | null
        }
        Update: {
          address?: string | null
          address_fr?: string | null
          attendance_target?: number | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"] | null
          collect_lodging?: boolean
          collect_meal_preferences?: boolean
          collect_pledges?: boolean
          cost?: number | null
          cost_currency_code?: string | null
          created_at?: string
          created_by?: string | null
          dcg_id?: string | null
          description?: string | null
          description_fr?: string | null
          detached_from_series?: boolean
          end_datetime?: string | null
          id?: string
          image_url?: string | null
          image_url_fr?: string | null
          is_featured?: boolean
          is_public?: boolean
          is_recurring_instance?: boolean
          is_special?: boolean | null
          linked_fundraising_campaign_id?: string | null
          location_name?: string | null
          location_name_fr?: string | null
          name?: string
          name_fr?: string | null
          organizer_email?: string | null
          organizer_name?: string | null
          organizer_phone?: string | null
          recurrence_rule_id?: string | null
          region_id?: string | null
          registration_url?: string | null
          requirements?: string | null
          requirements_fr?: string | null
          requires_pre_registration?: boolean
          slug?: string | null
          start_datetime?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          whatsapp_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_cost_currency_code_fkey"
            columns: ["cost_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_dcg_id_fkey"
            columns: ["dcg_id"]
            isOneToOne: false
            referencedRelation: "dcgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_linked_fundraising_campaign_id_fkey"
            columns: ["linked_fundraising_campaign_id"]
            isOneToOne: false
            referencedRelation: "fundraising_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "event_recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          ask: number
          base_code: string
          bid: number
          created_at: string
          created_by: string | null
          effective_at: string
          id: string
          is_active: boolean
          mid: number | null
          quote_code: string
          updated_at: string
        }
        Insert: {
          ask: number
          base_code: string
          bid: number
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          is_active?: boolean
          mid?: number | null
          quote_code: string
          updated_at?: string
        }
        Update: {
          ask?: number
          base_code?: string
          bid?: number
          created_at?: string
          created_by?: string | null
          effective_at?: string
          id?: string
          is_active?: boolean
          mid?: number | null
          quote_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_code_fkey"
            columns: ["base_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_code_fkey"
            columns: ["quote_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      financial_transaction_categories: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["financial_transaction_type"]
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["financial_transaction_type"]
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["financial_transaction_type"]
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          currency_code: string
          dcg_id: string | null
          description: string | null
          id: string
          recorded_by: string | null
          region_id: string | null
          scope: string
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          currency_code: string
          dcg_id?: string | null
          description?: string | null
          id?: string
          recorded_by?: string | null
          region_id?: string | null
          scope?: string
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          currency_code?: string
          dcg_id?: string | null
          description?: string | null
          id?: string
          recorded_by?: string | null
          region_id?: string | null
          scope?: string
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "financial_transactions_dcg_id_fkey"
            columns: ["dcg_id"]
            isOneToOne: false
            referencedRelation: "dcgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraising_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          end_date: string | null
          goal: number
          id: string
          image_url: string | null
          is_public: boolean
          name: string
          pledged_total: number
          raised: number
          region_id: string | null
          scope: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          end_date?: string | null
          goal: number
          id?: string
          image_url?: string | null
          is_public?: boolean
          name: string
          pledged_total?: number
          raised?: number
          region_id?: string | null
          scope?: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          end_date?: string | null
          goal?: number
          id?: string
          image_url?: string | null
          is_public?: boolean
          name?: string
          pledged_total?: number
          raised?: number
          region_id?: string | null
          scope?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_fundraising_campaigns_currency"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fundraising_campaigns_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraising_donations: {
        Row: {
          amount: number
          anonymous: boolean
          campaign_id: string
          created_at: string
          currency_code: string
          donation_date: string
          donor_email: string | null
          donor_id: string | null
          donor_name: string | null
          event_pre_registration_id: string | null
          id: string
          member_id: string | null
          message: string | null
          status: string
        }
        Insert: {
          amount: number
          anonymous?: boolean
          campaign_id: string
          created_at?: string
          currency_code?: string
          donation_date?: string
          donor_email?: string | null
          donor_id?: string | null
          donor_name?: string | null
          event_pre_registration_id?: string | null
          id?: string
          member_id?: string | null
          message?: string | null
          status?: string
        }
        Update: {
          amount?: number
          anonymous?: boolean
          campaign_id?: string
          created_at?: string
          currency_code?: string
          donation_date?: string
          donor_email?: string | null
          donor_id?: string | null
          donor_name?: string | null
          event_pre_registration_id?: string | null
          id?: string
          member_id?: string | null
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_fundraising_donations_currency"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fundraising_donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "fundraising_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraising_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraising_donations_event_pre_registration_id_fkey"
            columns: ["event_pre_registration_id"]
            isOneToOne: false
            referencedRelation: "event_pre_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraising_pledges: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          currency_code: string
          donor_id: string | null
          id: string
          member_id: string | null
          note: string | null
          pledger_email: string | null
          pledger_name: string
          pledger_phone: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          currency_code: string
          donor_id?: string | null
          id?: string
          member_id?: string | null
          note?: string | null
          pledger_email?: string | null
          pledger_name: string
          pledger_phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          currency_code?: string
          donor_id?: string | null
          id?: string
          member_id?: string | null
          note?: string | null
          pledger_email?: string | null
          pledger_name?: string
          pledger_phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraising_pledges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "fundraising_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraising_pledges_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraising_pledges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      global_content: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          page_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string
          capacity: number | null
          city: string
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          facilities: string | null
          fellowship_times: Json | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          region_id: string
          state: string
          status: string
          type: string
          updated_at: string
          website_url: string | null
          whatsapp_link: string | null
          zip: string
        }
        Insert: {
          address: string
          capacity?: number | null
          city: string
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          facilities?: string | null
          fellowship_times?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          region_id: string
          state: string
          status?: string
          type: string
          updated_at?: string
          website_url?: string | null
          whatsapp_link?: string | null
          zip: string
        }
        Update: {
          address?: string
          capacity?: number | null
          city?: string
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          facilities?: string | null
          fellowship_times?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          region_id?: string
          state?: string
          status?: string
          type?: string
          updated_at?: string
          website_url?: string | null
          whatsapp_link?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_relationships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          member_id: string
          notes: string | null
          related_member_id: string
          relationship_type: Database["public"]["Enums"]["family_relationship_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          related_member_id: string
          relationship_type: Database["public"]["Enums"]["family_relationship_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          related_member_id?: string
          relationship_type?: Database["public"]["Enums"]["family_relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "member_relationships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_relationships_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_targets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          region_id: string
          target_date: string
          target_members: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          region_id: string
          target_date: string
          target_members: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          region_id?: string
          target_date?: string
          target_members?: number
          updated_at?: string
        }
        Relationships: []
      }
      member_transfers: {
        Row: {
          from_region_id: string
          id: string
          member_id: string
          new_member_code: string
          notes: string | null
          old_member_code: string
          reason: string | null
          to_region_id: string
          transferred_at: string
          transferred_by: string | null
        }
        Insert: {
          from_region_id: string
          id?: string
          member_id: string
          new_member_code: string
          notes?: string | null
          old_member_code: string
          reason?: string | null
          to_region_id: string
          transferred_at?: string
          transferred_by?: string | null
        }
        Update: {
          from_region_id?: string
          id?: string
          member_id?: string
          new_member_code?: string
          notes?: string | null
          old_member_code?: string
          reason?: string | null
          to_region_id?: string
          transferred_at?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_transfers_from_region_id_fkey"
            columns: ["from_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_transfers_to_region_id_fkey"
            columns: ["to_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          baptism_date: string | null
          created_at: string | null
          event_satisfaction_rating: number | null
          foundation_school_date: string | null
          id: string
          is_volunteer: boolean | null
          join_date: string | null
          join_interest: string | null
          member_id: string
          member_type: string
          membership_class_completed: boolean | null
          notes: string | null
          photo_url: string | null
          preferred_service_areas: string[] | null
          profile_id: string | null
          rated_event_id: string | null
          referral_other_details: string | null
          referral_person_name: string | null
          referral_source: string | null
          region_id: string
          skills_talents: string[] | null
          status: Database["public"]["Enums"]["member_status"] | null
          updated_at: string | null
        }
        Insert: {
          baptism_date?: string | null
          created_at?: string | null
          event_satisfaction_rating?: number | null
          foundation_school_date?: string | null
          id?: string
          is_volunteer?: boolean | null
          join_date?: string | null
          join_interest?: string | null
          member_id: string
          member_type?: string
          membership_class_completed?: boolean | null
          notes?: string | null
          photo_url?: string | null
          preferred_service_areas?: string[] | null
          profile_id?: string | null
          rated_event_id?: string | null
          referral_other_details?: string | null
          referral_person_name?: string | null
          referral_source?: string | null
          region_id: string
          skills_talents?: string[] | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Update: {
          baptism_date?: string | null
          created_at?: string | null
          event_satisfaction_rating?: number | null
          foundation_school_date?: string | null
          id?: string
          is_volunteer?: boolean | null
          join_date?: string | null
          join_interest?: string | null
          member_id?: string
          member_type?: string
          membership_class_completed?: boolean | null
          notes?: string | null
          photo_url?: string | null
          preferred_service_areas?: string[] | null
          profile_id?: string | null
          rated_event_id?: string | null
          referral_other_details?: string | null
          referral_person_name?: string | null
          referral_source?: string | null
          region_id?: string
          skills_talents?: string[] | null
          status?: Database["public"]["Enums"]["member_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_rated_event_id_fkey"
            columns: ["rated_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      occupations: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          name_fr: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          name_fr?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          name_fr?: string | null
        }
        Relationships: []
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          otp_code: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          otp_code: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          otp_code?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          occupation: string | null
          phone: string | null
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          occupation?: string | null
          phone?: string | null
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          occupation?: string | null
          phone?: string | null
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_plan_initiatives: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          owner_user_id: string | null
          plan_id: string
          priority: Database["public"]["Enums"]["regional_plan_initiative_priority"]
          status: Database["public"]["Enums"]["regional_plan_initiative_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_user_id?: string | null
          plan_id: string
          priority?: Database["public"]["Enums"]["regional_plan_initiative_priority"]
          status?: Database["public"]["Enums"]["regional_plan_initiative_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_user_id?: string | null
          plan_id?: string
          priority?: Database["public"]["Enums"]["regional_plan_initiative_priority"]
          status?: Database["public"]["Enums"]["regional_plan_initiative_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_plan_initiatives_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "regional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_plan_targets: {
        Row: {
          category: Database["public"]["Enums"]["regional_plan_target_category"]
          created_at: string
          id: string
          metric_key: string
          notes: string | null
          plan_id: string
          target_value: number
          unit: Database["public"]["Enums"]["regional_plan_target_unit"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["regional_plan_target_category"]
          created_at?: string
          id?: string
          metric_key: string
          notes?: string | null
          plan_id: string
          target_value?: number
          unit?: Database["public"]["Enums"]["regional_plan_target_unit"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["regional_plan_target_category"]
          created_at?: string
          id?: string
          metric_key?: string
          notes?: string | null
          plan_id?: string
          target_value?: number
          unit?: Database["public"]["Enums"]["regional_plan_target_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_plan_targets_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "regional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_plans: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          mission_statement: string | null
          period_type: Database["public"]["Enums"]["regional_plan_period_type"]
          region_id: string
          review_notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["regional_plan_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          mission_statement?: string | null
          period_type?: Database["public"]["Enums"]["regional_plan_period_type"]
          region_id: string
          review_notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["regional_plan_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          mission_statement?: string | null
          period_type?: Database["public"]["Enums"]["regional_plan_period_type"]
          region_id?: string
          review_notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["regional_plan_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_plans_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json
          region_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          region_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          region_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      regional_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          region_id: string
          regional_role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          region_id: string
          regional_role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          region_id?: string
          regional_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_user_roles_regional_role_id_fkey"
            columns: ["regional_role_id"]
            isOneToOne: false
            referencedRelation: "regional_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          address: string | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          currency_code: string | null
          description: string | null
          established_date: string | null
          hero_slide_images: Json | null
          hero_slide_images_mobile: Json | null
          hero_slide_images_tablet: Json | null
          id: string
          is_active: boolean | null
          name: string
          regional_president: string | null
          regional_president_photo: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          established_date?: string | null
          hero_slide_images?: Json | null
          hero_slide_images_mobile?: Json | null
          hero_slide_images_tablet?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          regional_president?: string | null
          regional_president_photo?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          established_date?: string | null
          hero_slide_images?: Json | null
          hero_slide_images_mobile?: Json | null
          hero_slide_images_tablet?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          regional_president?: string | null
          regional_president_photo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      super_admin_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_reserved: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_reserved?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_reserved?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      super_admin_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          super_admin_role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          super_admin_role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          super_admin_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_user_roles_super_admin_role_id_fkey"
            columns: ["super_admin_role_id"]
            isOneToOne: false
            referencedRelation: "super_admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          is_active: boolean | null
          region_id: string | null
          rejection_reason: string | null
          requested_regional_role_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_role_status"] | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          is_active?: boolean | null
          region_id?: string | null
          rejection_reason?: string | null
          requested_regional_role_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_role_status"] | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          is_active?: boolean | null
          region_id?: string | null
          rejection_reason?: string | null
          requested_regional_role_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_role_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_requested_regional_role_id_fkey"
            columns: ["requested_regional_role_id"]
            isOneToOne: false
            referencedRelation: "regional_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_annual_reviews: {
        Row: {
          achievements: string | null
          business_status: string | null
          businesses_supported: number
          challenges: string | null
          community_initiatives: number
          created_at: string
          id: string
          jobs_created: number
          next_objectives: string | null
          people_trained: number
          review_year: number
          reviewed_by: string | null
          sdg_evidence: Json
          status: string
          submitted_at: string | null
          updated_at: string
          wcbn_member_id: string
        }
        Insert: {
          achievements?: string | null
          business_status?: string | null
          businesses_supported?: number
          challenges?: string | null
          community_initiatives?: number
          created_at?: string
          id?: string
          jobs_created?: number
          next_objectives?: string | null
          people_trained?: number
          review_year: number
          reviewed_by?: string | null
          sdg_evidence?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wcbn_member_id: string
        }
        Update: {
          achievements?: string | null
          business_status?: string | null
          businesses_supported?: number
          challenges?: string | null
          community_initiatives?: number
          created_at?: string
          id?: string
          jobs_created?: number
          next_objectives?: string | null
          people_trained?: number
          review_year?: number
          reviewed_by?: string | null
          sdg_evidence?: Json
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wcbn_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_annual_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_annual_reviews_wcbn_member_id_fkey"
            columns: ["wcbn_member_id"]
            isOneToOne: false
            referencedRelation: "wcbn_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_application_stages: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          reviewer_id: string | null
          risk_level: string | null
          stage_code: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          risk_level?: string | null
          stage_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          risk_level?: string | null
          stage_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_application_stages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wcbn_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_application_stages_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_applications: {
        Row: {
          applicant_data: Json
          created_at: string
          criteria_version_id: string
          current_stage: string
          dcg_verified: boolean
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          status: string
          submitted_at: string | null
          updated_at: string
          wca_verified: boolean
          wcbn_member_id: string
        }
        Insert: {
          applicant_data?: Json
          created_at?: string
          criteria_version_id: string
          current_stage?: string
          dcg_verified?: boolean
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wca_verified?: boolean
          wcbn_member_id: string
        }
        Update: {
          applicant_data?: Json
          created_at?: string
          criteria_version_id?: string
          current_stage?: string
          dcg_verified?: boolean
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wca_verified?: boolean
          wcbn_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_applications_criteria_version_id_fkey"
            columns: ["criteria_version_id"]
            isOneToOne: false
            referencedRelation: "wcbn_criteria_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_applications_wcbn_member_id_fkey"
            columns: ["wcbn_member_id"]
            isOneToOne: false
            referencedRelation: "wcbn_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_business_sdgs: {
        Row: {
          business_id: string
          contribution: string | null
          sdg_number: number
        }
        Insert: {
          business_id: string
          contribution?: string | null
          sdg_number: number
        }
        Update: {
          business_id?: string
          contribution?: string | null
          sdg_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_business_sdgs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "wcbn_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_businesses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          city: string | null
          country: string
          cover_url: string | null
          created_at: string
          description: string | null
          display_name: string
          email: string | null
          employee_count: number | null
          gallery: Json
          id: string
          is_active: boolean
          is_featured: boolean
          legal_name: string
          logo_url: string | null
          markets: Json
          owner_member_id: string
          phone: string | null
          products_services: Json
          registration_number: string | null
          risk_level: string
          sector: string
          slug: string
          summary: string | null
          updated_at: string
          vetting_status: string
          website_url: string | null
          years_operating: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          country: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          email?: string | null
          employee_count?: number | null
          gallery?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          legal_name: string
          logo_url?: string | null
          markets?: Json
          owner_member_id: string
          phone?: string | null
          products_services?: Json
          registration_number?: string | null
          risk_level?: string
          sector: string
          slug: string
          summary?: string | null
          updated_at?: string
          vetting_status?: string
          website_url?: string | null
          years_operating?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          email?: string | null
          employee_count?: number | null
          gallery?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          legal_name?: string
          logo_url?: string | null
          markets?: Json
          owner_member_id?: string
          phone?: string | null
          products_services?: Json
          registration_number?: string | null
          risk_level?: string
          sector?: string
          slug?: string
          summary?: string | null
          updated_at?: string
          vetting_status?: string
          website_url?: string | null
          years_operating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_businesses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_businesses_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "wcbn_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_criteria: {
        Row: {
          code: string
          config: Json
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_disqualifying: boolean
          is_required: boolean
          label: string
          section: string
          version_id: string
          weight: number
        }
        Insert: {
          code: string
          config?: Json
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_disqualifying?: boolean
          is_required?: boolean
          label: string
          section: string
          version_id: string
          weight?: number
        }
        Update: {
          code?: string
          config?: Json
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_disqualifying?: boolean
          is_required?: boolean
          label?: string
          section?: string
          version_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_criteria_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "wcbn_criteria_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_criteria_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          minimum_score: number
          name: string
          strong_score: number
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          minimum_score?: number
          name: string
          strong_score?: number
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          minimum_score?: number
          name?: string
          strong_score?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_criteria_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_dues_plans: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency_code: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency_code: string
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency_code?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_dues_plans_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      wcbn_impact_commitments: {
        Row: {
          created_at: string
          id: string
          measures: Json
          sdg_numbers: number[]
          statement: string
          status: string
          target_year: number
          updated_at: string
          wcbn_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          measures?: Json
          sdg_numbers?: number[]
          statement: string
          status?: string
          target_year: number
          updated_at?: string
          wcbn_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          measures?: Json
          sdg_numbers?: number[]
          statement?: string
          status?: string
          target_year?: number
          updated_at?: string
          wcbn_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_impact_commitments_wcbn_member_id_fkey"
            columns: ["wcbn_member_id"]
            isOneToOne: false
            referencedRelation: "wcbn_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_invoices: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          due_date: string
          dues_plan_id: string | null
          id: string
          invoice_number: string
          paid_amount: number
          period_end: string
          period_start: string
          status: string
          updated_at: string
          wcbn_member_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          due_date: string
          dues_plan_id?: string | null
          id?: string
          invoice_number: string
          paid_amount?: number
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
          wcbn_member_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          due_date?: string
          dues_plan_id?: string | null
          id?: string
          invoice_number?: string
          paid_amount?: number
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
          wcbn_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "wcbn_invoices_dues_plan_id_fkey"
            columns: ["dues_plan_id"]
            isOneToOne: false
            referencedRelation: "wcbn_dues_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_invoices_wcbn_member_id_fkey"
            columns: ["wcbn_member_id"]
            isOneToOne: false
            referencedRelation: "wcbn_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_member_documents: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          storage_path: string
          updated_at: string
          uploaded_by: string
          wcbn_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
          wcbn_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          wcbn_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_member_documents_wcbn_member_id_fkey"
            columns: ["wcbn_member_id"]
            isOneToOne: false
            referencedRelation: "wcbn_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_members: {
        Row: {
          category: string
          covenant_accepted_at: string | null
          created_at: string
          id: string
          inducted_at: string | null
          member_id: string
          next_review_date: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          covenant_accepted_at?: string | null
          created_at?: string
          id?: string
          inducted_at?: string | null
          member_id: string
          next_review_date?: string | null
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          covenant_accepted_at?: string | null
          created_at?: string
          id?: string
          inducted_at?: string | null
          member_id?: string
          next_review_date?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_payments: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string | null
          proof_url: string | null
          provider: string | null
          reference: string | null
          status: string
          submitted_by: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          id?: string
          invoice_id: string
          method: string
          notes?: string | null
          paid_at?: string | null
          proof_url?: string | null
          provider?: string | null
          reference?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          proof_url?: string | null
          provider?: string | null
          reference?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "wcbn_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "wcbn_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_payments_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      wcbn_scores: {
        Row: {
          application_id: string
          created_at: string
          criterion_id: string
          id: string
          is_red_flag: boolean
          notes: string | null
          reviewer_id: string
          score: number
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          criterion_id: string
          id?: string
          is_red_flag?: boolean
          notes?: string | null
          reviewer_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          criterion_id?: string
          id?: string
          is_red_flag?: boolean
          notes?: string | null
          reviewer_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wcbn_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "wcbn_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_scores_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wcbn_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wcbn_user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "wcbn_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wcbn_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_auth_user_for_profile: {
        Args: { p_email: string; p_password?: string; p_profile_id: string }
        Returns: string
      }
      admin_sync_auth_email_for_profile: {
        Args: { p_profile_id: string }
        Returns: string
      }
      generate_member_id: { Args: { _region_id: string }; Returns: string }
      get_attendance_summary: {
        Args: { p_region_id: string }
        Returns: {
          absent_count: number
          event_date: string
          event_id: string
          event_name: string
          present_count: number
        }[]
      }
      get_discipleship_impact_trend: {
        Args: { _member_id: string; _region_id: string }
        Returns: {
          disciples_attended: number
          event_date: string
          event_name: string
          mentor_attended: boolean
        }[]
      }
      get_global_attendance_summary: {
        Args: never
        Returns: {
          avg_attendance: number
          region_id: string
          total_events: number
          total_present: number
        }[]
      }
      get_member_discipleship_stats: {
        Args: { _member_id: string }
        Returns: {
          active_disciples: number
          completed_disciples: number
          success_rate: number
          total_disciples: number
        }[]
      }
      get_member_ids_for_user: { Args: { _user_id: string }; Returns: string[] }
      get_my_regional_context: { Args: never; Returns: Json }
      get_next_dcg_meeting: {
        Args: { _dcg_id: string }
        Returns: {
          event_date: string
          event_id: string
          event_name: string
          is_today: boolean
          is_upcoming: boolean
        }[]
      }
      get_region_from_dcg: { Args: { _dcg_id: string }; Returns: string }
      get_user_dcg: { Args: { _user_id: string }; Returns: string }
      get_user_region: { Args: { _user_id: string }; Returns: string }
      has_regional_permission: {
        Args: { _permission: string; _region_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_super_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      is_principal_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin_user: { Args: { _user_id: string }; Returns: boolean }
      search_all_donors: {
        Args: { _search?: string }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          region_id: string
        }[]
      }
      search_all_members: {
        Args: { _search?: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
          member_id: string
        }[]
      }
      search_region_members: {
        Args: { _region_id: string; _search?: string }
        Returns: {
          first_name: string
          id: string
          last_name: string
          member_id: string
        }[]
      }
      user_belongs_to_region: {
        Args: { _region_id: string; _user_id: string }
        Returns: boolean
      }
      wcbn_accept_covenant: { Args: never; Returns: string }
      wcbn_has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      wcbn_submit_application: {
        Args: { _application_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "regional_admin" | "member" | "dcg_admin"
      communication_message_type:
        | "announcement"
        | "invitation"
        | "reminder"
        | "update"
        | "urgent"
      communication_status:
        | "draft"
        | "sent"
        | "scheduled"
        | "failed"
        | "cancelled"
      dcg_member_role: "Leader" | "Assistant" | "Member"
      discipleship_milestone:
        | "first_visit"
        | "second_visit"
        | "committed"
        | "baptized"
        | "became_member"
        | "serving"
        | "talking_stage"
      discipleship_status: "active" | "completed" | "transferred" | "inactive"
      email_delivery_status:
        | "pending"
        | "sent"
        | "delivered"
        | "bounced"
        | "failed"
        | "complained"
      event_category:
        | "Conference"
        | "Worship"
        | "Revival"
        | "Outreach"
        | "Training"
        | "Workshop"
        | "Community Service"
        | "Bible Study"
        | "Retreat"
        | "Seminar"
        | "DCG Meeting"
        | "Other"
      event_status: "Upcoming" | "Completed" | "Cancelled" | "Draft"
      family_relationship_type:
        | "spouse"
        | "parent"
        | "child"
        | "sibling"
        | "guardian"
        | "other"
      financial_transaction_type: "Income" | "Expense"
      member_status: "active" | "inactive" | "new" | "transferred"
      regional_permission:
        | "dashboard_view"
        | "members_view"
        | "members_create"
        | "members_edit"
        | "members_export"
        | "events_view"
        | "events_create"
        | "events_edit"
        | "events_delete"
        | "finances_view"
        | "finances_create"
        | "finances_edit"
        | "dcg_view"
        | "dcg_create"
        | "dcg_edit"
        | "reports_view"
        | "reports_export"
        | "communication_view"
        | "communication_create"
        | "communication_send"
        | "locations_view"
        | "locations_create"
        | "locations_edit"
        | "fundraising_view"
        | "fundraising_create"
        | "fundraising_edit"
        | "settings_view"
        | "settings_edit"
      regional_plan_initiative_priority: "low" | "medium" | "high"
      regional_plan_initiative_status:
        | "not_started"
        | "in_progress"
        | "done"
        | "blocked"
      regional_plan_period_type: "quarter" | "year" | "custom"
      regional_plan_status: "draft" | "active" | "closed"
      regional_plan_target_category:
        | "growth"
        | "discipleship"
        | "events"
        | "dcg"
        | "finance"
      regional_plan_target_unit: "count" | "currency" | "percent"
      user_role_status: "pending" | "active" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "regional_admin", "member", "dcg_admin"],
      communication_message_type: [
        "announcement",
        "invitation",
        "reminder",
        "update",
        "urgent",
      ],
      communication_status: [
        "draft",
        "sent",
        "scheduled",
        "failed",
        "cancelled",
      ],
      dcg_member_role: ["Leader", "Assistant", "Member"],
      discipleship_milestone: [
        "first_visit",
        "second_visit",
        "committed",
        "baptized",
        "became_member",
        "serving",
        "talking_stage",
      ],
      discipleship_status: ["active", "completed", "transferred", "inactive"],
      email_delivery_status: [
        "pending",
        "sent",
        "delivered",
        "bounced",
        "failed",
        "complained",
      ],
      event_category: [
        "Conference",
        "Worship",
        "Revival",
        "Outreach",
        "Training",
        "Workshop",
        "Community Service",
        "Bible Study",
        "Retreat",
        "Seminar",
        "DCG Meeting",
        "Other",
      ],
      event_status: ["Upcoming", "Completed", "Cancelled", "Draft"],
      family_relationship_type: [
        "spouse",
        "parent",
        "child",
        "sibling",
        "guardian",
        "other",
      ],
      financial_transaction_type: ["Income", "Expense"],
      member_status: ["active", "inactive", "new", "transferred"],
      regional_permission: [
        "dashboard_view",
        "members_view",
        "members_create",
        "members_edit",
        "members_export",
        "events_view",
        "events_create",
        "events_edit",
        "events_delete",
        "finances_view",
        "finances_create",
        "finances_edit",
        "dcg_view",
        "dcg_create",
        "dcg_edit",
        "reports_view",
        "reports_export",
        "communication_view",
        "communication_create",
        "communication_send",
        "locations_view",
        "locations_create",
        "locations_edit",
        "fundraising_view",
        "fundraising_create",
        "fundraising_edit",
        "settings_view",
        "settings_edit",
      ],
      regional_plan_initiative_priority: ["low", "medium", "high"],
      regional_plan_initiative_status: [
        "not_started",
        "in_progress",
        "done",
        "blocked",
      ],
      regional_plan_period_type: ["quarter", "year", "custom"],
      regional_plan_status: ["draft", "active", "closed"],
      regional_plan_target_category: [
        "growth",
        "discipleship",
        "events",
        "dcg",
        "finance",
      ],
      regional_plan_target_unit: ["count", "currency", "percent"],
      user_role_status: ["pending", "active", "rejected"],
    },
  },
} as const
