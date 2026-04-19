export type CurrentValue = {
  metric_key: string;
  value: number | string;
  unit: string;
  updated_at: string;
};

export type Device = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: string;
  last_seen_at: string | null;
  current_values: CurrentValue[];
};

export type Alarm = {
  id: number;
  device_id: number;
  device_code: string;
  device_name: string;
  level: string;
  message: string;
  active: boolean;
  created_at: string;
};

export type Overview = {
  total_devices: number;
  online_devices: number;
  active_alarms: number;
  last_updated_at: string | null;
};

export type UpdateEvent = {
  type: string;
  device?: Device;
  keys?: string[];
  recorded_at?: string;
};

export type YujinMapValue = {
  key: string;
  data_type: number;
  data_length: number;
  signed: boolean;
  default_value: string;
  name: string | null;
  section: string;
  value: string;
  updated_at: string | null;
  source: string | null;
};
