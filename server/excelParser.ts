import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | boolean | null;
}

export interface ParseResult {
  success: boolean;
  data: ParsedRow[];
  headers: string[];
  totalRows: number;
  errors: string[];
}

export interface CustomerImportRow {
  name: string;
  registeredName?: string;
  tradeName?: string;
  industry?: string;
  businessType?: string;
  registrationCountry?: string;
  registrationAddress?: string;
  foundedDate?: string;
  employeeCount?: number;
  annualRevenue?: number;
  website?: string;
  phone?: string;
  email?: string;
  stockExchange?: string;
  stockSymbol?: string;
  description?: string;
}

export interface SubsidiaryImportRow {
  customerName: string;
  name: string;
  entityType?: string;
  country?: string;
  ownershipPercentage?: number;
  employeeCount?: number;
  parentSubsidiaryName?: string;
}

export interface OpportunityImportRow {
  customerName: string;
  name: string;
  productType?: string;
  stage?: string;
  amount?: number;
  probability?: number;
  description?: string;
}

export interface DealImportRow {
  customerName: string;
  name: string;
  productType?: string;
  amount?: number;
  closedDate?: string;
  status?: string;
}

// Parse Excel buffer to JSON
export function parseExcelBuffer(buffer: Buffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      return { success: false, data: [], headers: [], totalRows: 0, errors: ["No sheets found in workbook"] };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: null });
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    
    return {
      success: true,
      data: jsonData,
      headers,
      totalRows: jsonData.length,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      totalRows: 0,
      errors: [error instanceof Error ? error.message : "Unknown parsing error"],
    };
  }
}

// Get all sheet names from workbook
export function getSheetNames(buffer: Buffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return workbook.SheetNames;
  } catch {
    return [];
  }
}

// Parse specific sheet
export function parseSheet(buffer: Buffer, sheetName: string): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return { success: false, data: [], headers: [], totalRows: 0, errors: [`Sheet "${sheetName}" not found`] };
    }
    
    const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: null });
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    
    return {
      success: true,
      data: jsonData,
      headers,
      totalRows: jsonData.length,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      totalRows: 0,
      errors: [error instanceof Error ? error.message : "Unknown parsing error"],
    };
  }
}

// Normalize column names to match expected fields
const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  customer: {
    "company name": "name",
    "company": "name",
    "企业名称": "name",
    "公司名称": "name",
    "registered name": "registeredName",
    "注册名称": "registeredName",
    "trade name": "tradeName",
    "商号": "tradeName",
    "industry": "industry",
    "行业": "industry",
    "business type": "businessType",
    "业务类型": "businessType",
    "country": "registrationCountry",
    "国家": "registrationCountry",
    "address": "registrationAddress",
    "地址": "registrationAddress",
    "founded": "foundedDate",
    "founded date": "foundedDate",
    "成立日期": "foundedDate",
    "employees": "employeeCount",
    "employee count": "employeeCount",
    "员工数": "employeeCount",
    "revenue": "annualRevenue",
    "annual revenue": "annualRevenue",
    "年收入": "annualRevenue",
    "website": "website",
    "网站": "website",
    "phone": "phone",
    "电话": "phone",
    "email": "email",
    "邮箱": "email",
    "stock exchange": "stockExchange",
    "交易所": "stockExchange",
    "stock symbol": "stockSymbol",
    "股票代码": "stockSymbol",
    "description": "description",
    "描述": "description",
  },
  subsidiary: {
    "parent company": "customerName",
    "customer name": "customerName",
    "母公司": "customerName",
    "subsidiary name": "name",
    "name": "name",
    "子公司名称": "name",
    "entity type": "entityType",
    "type": "entityType",
    "类型": "entityType",
    "country": "country",
    "国家": "country",
    "ownership": "ownershipPercentage",
    "ownership percentage": "ownershipPercentage",
    "持股比例": "ownershipPercentage",
    "employees": "employeeCount",
    "员工数": "employeeCount",
    "parent subsidiary": "parentSubsidiaryName",
    "上级子公司": "parentSubsidiaryName",
  },
  opportunity: {
    "customer": "customerName",
    "customer name": "customerName",
    "客户名称": "customerName",
    "opportunity name": "name",
    "name": "name",
    "商机名称": "name",
    "product": "productType",
    "product type": "productType",
    "产品类型": "productType",
    "stage": "stage",
    "阶段": "stage",
    "amount": "amount",
    "金额": "amount",
    "probability": "probability",
    "概率": "probability",
    "description": "description",
    "描述": "description",
  },
  deal: {
    "customer": "customerName",
    "customer name": "customerName",
    "客户名称": "customerName",
    "deal name": "name",
    "name": "name",
    "成单名称": "name",
    "product": "productType",
    "product type": "productType",
    "产品类型": "productType",
    "amount": "amount",
    "金额": "amount",
    "closed date": "closedDate",
    "close date": "closedDate",
    "成单日期": "closedDate",
    "status": "status",
    "状态": "status",
  },
};

export function normalizeRow<T>(row: ParsedRow, dataType: "customer" | "subsidiary" | "opportunity" | "deal"): Partial<T> {
  const mappings = COLUMN_MAPPINGS[dataType];
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().trim();
    const mappedKey = mappings[normalizedKey] || normalizedKey;
    normalized[mappedKey] = value;
  }
  
  return normalized as Partial<T>;
}

export function validateCustomerRow(row: Partial<CustomerImportRow>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!row.name || typeof row.name !== "string" || row.name.trim() === "") {
    errors.push("Company name is required");
  }
  
  if (row.employeeCount !== undefined && row.employeeCount !== null) {
    const num = Number(row.employeeCount);
    if (isNaN(num) || num < 0) {
      errors.push("Employee count must be a positive number");
    }
  }
  
  if (row.annualRevenue !== undefined && row.annualRevenue !== null) {
    const num = Number(row.annualRevenue);
    if (isNaN(num) || num < 0) {
      errors.push("Annual revenue must be a positive number");
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateSubsidiaryRow(row: Partial<SubsidiaryImportRow>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!row.customerName || typeof row.customerName !== "string" || row.customerName.trim() === "") {
    errors.push("Parent company name is required");
  }
  
  if (!row.name || typeof row.name !== "string" || row.name.trim() === "") {
    errors.push("Subsidiary name is required");
  }
  
  if (row.ownershipPercentage !== undefined && row.ownershipPercentage !== null) {
    const num = Number(row.ownershipPercentage);
    if (isNaN(num) || num < 0 || num > 100) {
      errors.push("Ownership percentage must be between 0 and 100");
    }
  }
  
  return { valid: errors.length === 0, errors };
}
