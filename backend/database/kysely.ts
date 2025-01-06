import { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users_data: UserData;
  sp_data: SpData;
  service_data: ServiceData;
  service_feedback: ServiceFeedback;
}

export interface UserData {
  user_id: Generated<number>;
  user_name: string;
  user_email: string;
  user_pass: string;
  contact: number;
  address: string;
  services_requested?: number;
  created_at: Generated<string>;
}

export type User = Selectable<UserData>;
export type NewUser = Insertable<UserData>;
export type UpdateUser = Updateable<UserData>;

export interface SpData {
  sp_id: Generated<number>;
  sp_name: string;
  sp_email: string;
  sp_pass: string;
  skill: string;
  services_provided?: number;
  contact: number;
  rating?: number;
  availability?: number;
  created_at: Generated<string>;
}

export type Sp = Selectable<SpData>;
export type NewSp = Insertable<SpData>;
export type UpdateSp = Updateable<SpData>;

export interface ServiceData {
  srv_id: Generated<number>;
  user_id: number;
  sp_id: number;
  srv_type: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  rating?: number;
  service_charge: number;
  created_at: Generated<string>;
}

export type Service = Selectable<ServiceData>;
export type NewService = Insertable<ServiceData>;
export type UpdateService = Updateable<ServiceData>;

export interface ServiceFeedback {
  fb_id: Generated<number>;
  user_id: number;
  sp_id: number;
  srv_id: number;
  feedback: string;
  rating: number;
  created_at: Generated<string>;
}

export type Feedback = Selectable<ServiceFeedback>;
export type NewFeedback = Insertable<ServiceFeedback>;
