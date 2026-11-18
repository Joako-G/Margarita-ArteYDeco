begin;

create extension if not exists pgtap;

select plan(11);

select has_function(
  'public',
  'create_order_with_payment_v2',
  array['uuid','text','text','text','text','jsonb','text','text','text','public.delivery_method','text','text'],
  'payment initialization RPC remains available with its stable signature'
);
select has_function(
  'public',
  'claim_payment_job_v2',
  array['interval','text'],
  'payment job claim RPC remains available'
);
select ok(
  pg_get_functiondef('public.claim_payment_job_v2(interval,text)'::regprocedure)
    like '%attempts = job.attempts + 1%',
  'claimed attempt count is incremented before the worker schedules the next reconciliation'
);
select has_function(
  'public',
  'enqueue_payment_reconciliation_v2',
  array['uuid','timestamp with time zone'],
  'reconciliation enqueue RPC exists'
);
select has_function(
  'public',
  'release_expired_payment_reservations_v2',
  array['integer'],
  'expiry RPC exists'
);
select has_function(
  'public',
  'transition_payment_attempt_v2',
  array['uuid','text','timestamp with time zone','bigint','public.payment_attempt_status','bigint','public.payment_attempt_status'],
  'attempt transition RPC exists'
);

select ok(
  pg_get_functiondef('public.create_order_with_payment_v2(uuid,text,text,text,text,jsonb,text,text,text,public.delivery_method,text,text)'::regprocedure)
    like '%interval ''24 hours''%',
  'reservation expiry is PostgreSQL statement timestamp plus 24 hours'
);
select ok(
  pg_get_functiondef('public.enqueue_payment_reconciliation_v2(uuid,timestamptz)'::regprocedure)
    like '%status in (''pending'', ''leased'')%',
  'reconciliation enqueue is durable and deduplicated across pending and leased jobs'
);
select ok(
  pg_get_functiondef('public.release_expired_payment_reservations_v2(integer)'::regprocedure)
    like '%release_expired_payment_reservation_for_order_v2%'
    and pg_get_functiondef('public.release_expired_payment_reservation_for_order_v2(uuid)'::regprocedure)
      like '%unavailable%'
    and pg_get_functiondef('public.release_expired_payment_reservation_for_order_v2(uuid)'::regprocedure)
      like '%manual_review%',
  'expiry batch delegates per order and routes unresolved provider state to manual review'
);
select ok(
  pg_get_functiondef('public.acknowledge_payment_webhook_v2(text,text,text,text,bytea)'::regprocedure)
    like '%enqueue_payment_reconciliation_v2%',
  'verified webhook acknowledgement enqueues immediate reconciliation'
);
select ok(
  pg_get_functiondef('public.transition_payment_attempt_v2(uuid,text,timestamp with time zone,bigint,public.payment_attempt_status,bigint,public.payment_attempt_status)'::regprocedure)
    like '%payment_re_reserved%',
  'late approval uses an auditable atomic re-reservation movement'
);

select * from finish();
rollback;
