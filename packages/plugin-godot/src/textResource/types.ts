export interface GodotTextResourceTag {
  line: number;
  name: string;
  fields: Record<string, string>;
}

export interface GodotTextResourceDocument {
  tags: GodotTextResourceTag[];
}

export interface GodotProjectSetting {
  line: number;
  section: string | null;
  key: string;
  value: string;
}

export interface GodotProjectSettingsDocument {
  settings: GodotProjectSetting[];
}
