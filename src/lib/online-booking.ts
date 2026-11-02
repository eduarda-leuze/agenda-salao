import { z } from 'zod';
export const ONLINE_DEFAULTS = { autoConfirmar: false, antecedenciaHoras: 2, diasMax: 30, pendentesMax: 3 };
const ddds = '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' ');
export const whatsappSchema = z.string().max(30).transform(v=>v.replace(/\D/g,'')).refine(v=>/^\d{2}9\d{8}$/.test(v)&&ddds.includes(v.slice(0,2)), 'Informe um WhatsApp brasileiro válido com DDD.');
export const bookingSchema = z.object({nome:z.string().trim().min(2).max(100),telefone:whatsappSchema,servicoId:z.string().uuid(),profissionalId:z.string().uuid(),inicio:z.string().datetime({offset:true})});
export const slotsSchema=z.object({data:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),servicoId:z.string().uuid(),profissionalId:z.string().uuid().optional()});
export const catalogSchema=z.object({nome:z.string(),autoConfirmar:z.boolean(),antecedenciaHoras:z.number(),diasMax:z.number(),hoje:z.string(),servicos:z.array(z.object({id:z.string(),nome:z.string(),preco:z.number(),duracao_min:z.number()})),profissionais:z.array(z.object({id:z.string(),nome:z.string()})),vinculos:z.array(z.object({servico_id:z.string(),profissional_id:z.string()}))});
export const resultSchema=z.object({confirmado:z.boolean(),inicio:z.string(),fim:z.string(),profissional:z.string(),servico:z.string()});
