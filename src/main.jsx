import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import{createClient}from'@supabase/supabase-js';
import'./style.css';

const supabase=createClient('https://ywwztahbqgiwervbwudg.supabase.co','sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx');
const logo='/logo.png?v=23';
const ROTAS_PADRAO=['Rota 01 - Zona Rural','Rota 02 - Centro','Rota 03 - Vila Nova'];
const PRODUTOS_PADRAO=['Leite','Queijo grande','Queijo de meio quilo','Queijo 500g','Queijo 1kg'];
const MENU=['dashboard','clientes','produtos','pedidos','entregas','relatorios','admins'];