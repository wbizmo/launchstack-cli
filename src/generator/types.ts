export type TemplateName = "api";

export type TemplateFile = {
  source: string;
  destination: string;
};

export type ProjectTemplate = {
  name: TemplateName;
  rootDirectory: string;
};

export type GenerateProjectOptions = {
  projectName: string;
  destinationDirectory: string;
  template: TemplateName;
  overwrite?: boolean;
};
