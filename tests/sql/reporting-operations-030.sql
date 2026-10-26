BEGIN;
-- ISOLATED SYNTHETIC MANAGEMENT ACCEPTANCE ONLY. NEVER RUN ON PRODUCTION.
-- Requires TASK030 migration. This script does not verify real-user API/RLS/UI;
-- those require separate ordinary authenticated sessions and browser evidence.
-- An authorized executor MUST independently verify the actual connected project
-- is kirvcbkbkvotnsqnbcyf before setting these session settings and executing.
-- GUCs are caller declarations, NOT connection identity or security proof.
-- Required existing session settings (supplied outside this script):
--   kcny.test_project = kirvcbkbkvotnsqnbcyf
--   kcny.test_user_a = <explicitly approved existing synthetic Auth UUID>
--   kcny.test_reviewer = <different explicitly approved synthetic Auth UUID>
-- Never infer either identity from email, nickname or account ordering.
-- Run in a dedicated management connection with stop-on-error enabled. If any
-- assertion fails, issue ROLLBACK/close that connection; never COMMIT this test.
-- All inserted text is synthetic; no credentials or original case text output.
-- Public reporting/operations enabled flags are NOT turned on by this script.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $test030$
DECLARE
  owner_id uuid;
  reviewer_id uuid;
  case_id uuid := gen_random_uuid();
  legacy_request_id uuid := gen_random_uuid();
  data_request_id uuid := gen_random_uuid();
  data_request_key uuid := gen_random_uuid();
  review_event_id uuid := gen_random_uuid();
  operation_event_id uuid := gen_random_uuid();
  membership_event_id uuid;
  extra_request_id uuid := gen_random_uuid();
  nil_id constant uuid := '00000000-0000-0000-0000-000000000000';
  approval_ref text;
  before_case jsonb;
  before_audit jsonb;
  before_operations jsonb;
  before_data_request jsonb;
  before_data_review jsonb;
  before_retention jsonb;
  before_legacy_payload jsonb;
  before_request_key jsonb;
  actual_audit jsonb;
  actual_operations jsonb;
  result jsonb;
  retry_result jsonb;
  blocked boolean;
  hold_value text;
  audit_time timestamptz := now() - interval '100 days';
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'test030_requires_authorized_postgres_management';
  END IF;
  IF current_setting('kcny.test_project', true) IS DISTINCT FROM 'kirvcbkbkvotnsqnbcyf' THEN
    RAISE EXCEPTION 'test030_explicit_isolated_project_setting_required';
  END IF;
  IF coalesce(current_setting('kcny.test_user_a', true), '') = ''
    OR coalesce(current_setting('kcny.test_reviewer', true), '') = '' THEN
    RAISE EXCEPTION 'test030_explicit_synthetic_auth_id_settings_required';
  END IF;
  owner_id := current_setting('kcny.test_user_a')::uuid;
  reviewer_id := current_setting('kcny.test_reviewer')::uuid;
  IF owner_id = reviewer_id OR owner_id = nil_id OR reviewer_id = nil_id
    OR (SELECT count(*) FROM auth.users WHERE id IN (owner_id, reviewer_id)
      AND confirmed_at IS NOT NULL AND deleted_at IS NULL AND NOT is_anonymous) <> 2 THEN
    RAISE EXCEPTION 'test030_two_explicit_confirmed_synthetic_auth_users_required';
  END IF;
  IF to_regprocedure('reporting_private.redact_case(uuid,integer,text)') IS NULL THEN
    RAISE EXCEPTION 'test030_migration_dependency_missing';
  END IF;
  approval_ref := 'TEST030-Clear-' || case_id::text;

  -- Grant in this transaction only; final rollback restores pre-test membership.
  PERFORM reporting_private.set_reviewer(reviewer_id, true, 'TEST030-Grant-' || case_id::text);
  SELECT id INTO STRICT membership_event_id
    FROM reporting_private.reviewer_membership_events
    WHERE user_id = reviewer_id AND approval_reference = 'TEST030-Grant-' || case_id::text;

  -- Synthetic management fixture: no original complaint or real target is read.
  -- Direct fixture setup is not evidence that ordinary users can bypass APIs.
  INSERT INTO public.reports(id,reporter_id,kind,target_type,target_id,reason,
    description,status,public_resolution,version,created_at,updated_at)
    VALUES(case_id,owner_id,'complaint','profile',reviewer_id,'privacy',
      'SYNTHETIC030 case body private marker','resolved',
      'SYNTHETIC030 public result private marker',3,
      audit_time - interval '1 day',audit_time);
  INSERT INTO reporting_private.requests(reporter_id,request_id,payload,report_id)
    VALUES(owner_id,legacy_request_id,jsonb_build_object(
      'kind','complaint','target_type','profile','target_ref',reviewer_id::text,
      'reason','privacy','description','SYNTHETIC030 duplicated legacy payload marker'),case_id);
  INSERT INTO reporting_private.review_events(id,report_id,actor_id,from_status,
    to_status,decision_reason,internal_note,created_at)
    VALUES(review_event_id,case_id,reviewer_id,'under_review','resolved',
      'SYNTHETIC030 old audit reason marker','SYNTHETIC030 old internal note marker',audit_time);
  INSERT INTO public.report_data_requests(id,report_id,requester_id,request_kind,
    details,status,public_response,version,created_at,updated_at)
    VALUES(data_request_id,case_id,owner_id,'deletion',
      'SYNTHETIC030 privacy request private details marker','approved',
      'SYNTHETIC030 privacy request public response marker',3,audit_time,audit_time);
  INSERT INTO reporting_private.data_request_keys(requester_id,request_id,request_record_id,payload_hash)
    VALUES(owner_id,data_request_key,data_request_id,repeat('a',64));
  INSERT INTO reporting_private.data_request_reviews(request_id,reviewer_id,
    internal_reason,approval_reference,updated_at)
    VALUES(data_request_id,reviewer_id,'SYNTHETIC030 privacy internal review marker',
      'TEST030-Deletion-' || case_id::text,audit_time);
  INSERT INTO reporting_private.retention_reviews(report_id,review_version,
    decision,hold,reason,next_review_at,reviewed_by,reviewed_at)
    VALUES(case_id,1,'eligible_for_clear','none','SYNTHETIC030 retention private reason marker',
      now() + interval '1 day',reviewer_id,audit_time);
  INSERT INTO reporting_private.operation_events(id,report_id,request_id,
    actor_id,action,created_at)
    VALUES(operation_event_id,case_id,data_request_id,owner_id,
      'data_request_submitted',audit_time - interval '1 minute');
  INSERT INTO reporting_private.operation_events(report_id,request_id,
    actor_id,action,created_at)
    VALUES(case_id,data_request_id,reviewer_id,'data_request_approved',audit_time);

  -- Immutable guards must reject direct management UPDATE/DELETE without the
  -- function's private case+backend+transaction capability. No trigger disabling.
  blocked := false;
  BEGIN
    UPDATE reporting_private.review_events SET internal_note='not permitted' WHERE id=review_event_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_audit_update_not_denied'; END IF;
  blocked := false;
  BEGIN
    DELETE FROM reporting_private.review_events WHERE id=review_event_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_audit_delete_not_denied'; END IF;
  blocked := false;
  BEGIN
    UPDATE reporting_private.operation_events SET action='retention_retain' WHERE id=operation_event_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_operation_update_not_denied'; END IF;
  blocked := false;
  BEGIN
    DELETE FROM reporting_private.operation_events WHERE id=operation_event_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_operation_delete_not_denied'; END IF;
  blocked := false;
  BEGIN
    UPDATE reporting_private.reviewer_membership_events SET changed=false WHERE id=membership_event_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_membership_event_update_not_denied'; END IF;
  blocked := false;
  BEGIN
    DELETE FROM public.report_data_requests WHERE id=data_request_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_data_request_delete_not_denied'; END IF;
  blocked := false;
  BEGIN
    DELETE FROM public.reports WHERE id=case_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_direct_case_delete_not_denied'; END IF;

  -- An unapproved policy may not clear even this otherwise eligible fixture.
  UPDATE reporting_private.operations_configuration SET policy_approved=false WHERE singleton;
  blocked := false;
  BEGIN
    PERFORM reporting_private.redact_case(case_id,3,approval_ref);
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'approved_policy_and_case_authorization_required';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_policyfalse_clear_not_denied'; END IF;
  -- Synthetic transaction-only policy approval, restored by final ROLLBACK.
  UPDATE reporting_private.operations_configuration SET policy_approved=true WHERE singleton;
  FOREACH hold_value IN ARRAY ARRAY['appeal','legal','investigation'] LOOP
    UPDATE reporting_private.retention_reviews SET hold=hold_value WHERE report_id=case_id;
    blocked := false;
    BEGIN
      PERFORM reporting_private.redact_case(case_id,3,approval_ref);
    EXCEPTION WHEN invalid_parameter_value THEN
      blocked := SQLERRM = 'retention_not_eligible';
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'test030_hold_clear_not_denied'; END IF;
  END LOOP;
  UPDATE reporting_private.retention_reviews SET hold='none' WHERE report_id=case_id;

  -- A separate approved access request must block clearing; remove the fixture
  -- by subtransaction rollback, not by bypassing the no-delete trigger.
  BEGIN
    INSERT INTO public.report_data_requests(id,report_id,requester_id,request_kind,
      details,status,public_response)
      VALUES(extra_request_id,case_id,owner_id,'access',
        'SYNTHETIC030 unresolved approved access request','approved','Approved, not fulfilled');
    blocked := false;
    BEGIN
      PERFORM reporting_private.redact_case(case_id,3,approval_ref);
    EXCEPTION WHEN invalid_parameter_value THEN
      blocked := SQLERRM = 'outstanding_data_request';
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'test030_approved_access_clear_not_denied'; END IF;
    RAISE EXCEPTION USING ERRCODE='P0301',MESSAGE='test030_expected_extra_fixture_rollback';
  EXCEPTION WHEN SQLSTATE 'P0301' THEN
    NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.report_data_requests WHERE id=extra_request_id) THEN
    RAISE EXCEPTION 'test030_extra_request_subtransaction_not_restored';
  END IF;

  SELECT to_jsonb(c) INTO STRICT before_case FROM public.reports c WHERE c.id=case_id;
  SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) INTO before_audit
    FROM reporting_private.review_events e WHERE e.report_id=case_id;
  SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) INTO before_operations
    FROM reporting_private.operation_events e WHERE e.report_id=case_id;
  SELECT to_jsonb(q) INTO STRICT before_data_request FROM public.report_data_requests q WHERE q.id=data_request_id;
  SELECT to_jsonb(q) INTO STRICT before_data_review FROM reporting_private.data_request_reviews q WHERE q.request_id=data_request_id;
  SELECT to_jsonb(r) INTO STRICT before_retention FROM reporting_private.retention_reviews r WHERE r.report_id=case_id;
  SELECT to_jsonb(q) INTO STRICT before_legacy_payload FROM reporting_private.requests q WHERE q.report_id=case_id;
  SELECT to_jsonb(q) INTO STRICT before_request_key FROM reporting_private.data_request_keys q WHERE q.request_record_id=data_request_id;

  -- Deliberately fail AFTER a real completed function call inside a subtransaction.
  -- The narrowly caught sentinel rolls back the call, not unrelated assertions.
  BEGIN
    result := reporting_private.redact_case(case_id,3,approval_ref);
    IF result->>'cleared' IS DISTINCT FROM 'true'
      OR NOT EXISTS(SELECT 1 FROM reporting_private.redaction_receipts WHERE report_id=case_id) THEN
      RAISE EXCEPTION 'test030_rollback_probe_did_not_reach_completed_clear';
    END IF;
    RAISE EXCEPTION USING ERRCODE='P0302',MESSAGE='test030_expected_after_clear_rollback';
  EXCEPTION WHEN SQLSTATE 'P0302' THEN
    NULL;
  END;
  IF (SELECT to_jsonb(c) FROM public.reports c WHERE c.id=case_id) IS DISTINCT FROM before_case
    OR (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM reporting_private.review_events e WHERE e.report_id=case_id) IS DISTINCT FROM before_audit
    OR (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at,e.id) FROM reporting_private.operation_events e WHERE e.report_id=case_id) IS DISTINCT FROM before_operations
    OR (SELECT to_jsonb(q) FROM public.report_data_requests q WHERE q.id=data_request_id) IS DISTINCT FROM before_data_request
    OR (SELECT to_jsonb(q) FROM reporting_private.data_request_reviews q WHERE q.request_id=data_request_id) IS DISTINCT FROM before_data_review
    OR (SELECT to_jsonb(r) FROM reporting_private.retention_reviews r WHERE r.report_id=case_id) IS DISTINCT FROM before_retention
    OR (SELECT to_jsonb(q) FROM reporting_private.requests q WHERE q.report_id=case_id) IS DISTINCT FROM before_legacy_payload
    OR (SELECT to_jsonb(q) FROM reporting_private.data_request_keys q WHERE q.request_record_id=data_request_id) IS DISTINCT FROM before_request_key
    OR EXISTS(SELECT 1 FROM reporting_private.redaction_receipts WHERE report_id=case_id)
    OR EXISTS(SELECT 1 FROM reporting_private.redaction_scope WHERE report_id=case_id) THEN
    RAISE EXCEPTION 'test030_aftercall_rollback_changed_fixture';
  END IF;

  -- Now assert the real outcome within the outer transaction, still rolled back
  -- at script end. No production/user record can be selected by a fixture ID.
  result := reporting_private.redact_case(case_id,3,approval_ref);
  IF result->>'cleared' IS DISTINCT FROM 'true'
    OR result->>'already_cleared' IS DISTINCT FROM 'false'
    OR (result->>'audit_rows_redacted')::integer <> 1
    OR (result->>'operation_actors_redacted')::integer <> 2
    OR (result->>'idempotency_payloads_removed')::integer <> 1
    OR (result->>'data_requests_redacted')::integer <> 1 THEN
    RAISE EXCEPTION 'test030_clear_receipt_counts_mismatch';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.reports c WHERE c.id=case_id
    AND c.reporter_id=nil_id AND c.target_id=nil_id AND c.reason='other'
    AND c.description='Sensitive content cleared' AND c.public_resolution=''
    AND c.content_cleared_at IS NOT NULL AND c.version=4
    AND (to_jsonb(c)-ARRAY['reporter_id','target_id','reason','description','public_resolution','content_cleared_at','version'])
      = (before_case-ARRAY['reporter_id','target_id','reason','description','public_resolution','content_cleared_at','version'])) THEN
    RAISE EXCEPTION 'test030_case_text_identity_or_preserved_metadata_mismatch';
  END IF;
  SELECT jsonb_agg(to_jsonb(e)-ARRAY['actor_id','decision_reason','internal_note'] ORDER BY e.created_at,e.id)
    INTO actual_audit FROM reporting_private.review_events e WHERE e.report_id=case_id;
  IF actual_audit IS DISTINCT FROM (SELECT jsonb_agg(value-ARRAY['actor_id','decision_reason','internal_note'] ORDER BY value->>'created_at',value->>'id') FROM jsonb_array_elements(before_audit))
    OR EXISTS(SELECT 1 FROM reporting_private.review_events WHERE report_id=case_id
      AND (actor_id<>nil_id OR decision_reason<>'retention_redacted' OR internal_note<>'')) THEN
    RAISE EXCEPTION 'test030_audit_id_order_state_time_or_sensitive_fields_mismatch';
  END IF;
  SELECT jsonb_agg(to_jsonb(e)-'actor_id' ORDER BY e.created_at,e.id)
    INTO actual_operations FROM reporting_private.operation_events e
    WHERE e.report_id=case_id AND e.action<>'sensitive_content_cleared';
  IF actual_operations IS DISTINCT FROM (SELECT jsonb_agg(value-'actor_id' ORDER BY value->>'created_at',value->>'id') FROM jsonb_array_elements(before_operations))
    OR EXISTS(SELECT 1 FROM reporting_private.operation_events WHERE report_id=case_id AND actor_id<>nil_id)
    OR (SELECT count(*) FROM reporting_private.operation_events WHERE report_id=case_id AND action='sensitive_content_cleared')<>1 THEN
    RAISE EXCEPTION 'test030_operation_metadata_or_identity_mismatch';
  END IF;
  IF EXISTS(SELECT 1 FROM reporting_private.requests WHERE report_id=case_id)
    OR EXISTS(SELECT 1 FROM reporting_private.data_request_keys WHERE request_record_id=data_request_id) THEN
    RAISE EXCEPTION 'test030_idempotency_payload_or_identity_copy_remains';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.report_data_requests q WHERE q.id=data_request_id
    AND q.report_id=case_id AND q.requester_id=nil_id AND q.request_kind='deletion'
    AND q.details='Sensitive content cleared' AND q.public_response='' AND q.status='fulfilled' AND q.version=4
    AND q.created_at=(before_data_request->>'created_at')::timestamptz)
    OR NOT EXISTS(SELECT 1 FROM reporting_private.data_request_reviews q WHERE q.request_id=data_request_id
      AND q.reviewer_id=nil_id AND q.internal_reason='retention_redacted' AND q.approval_reference='')
    OR NOT EXISTS(SELECT 1 FROM reporting_private.retention_reviews r WHERE r.report_id=case_id
      AND r.decision='cleared' AND r.reviewed_by=nil_id AND r.reason='retention_redacted'
      AND r.next_review_at IS NULL AND r.review_version=2) THEN
    RAISE EXCEPTION 'test030_private_request_or_retention_text_identity_remains';
  END IF;
  IF EXISTS(SELECT 1 FROM reporting_private.redaction_scope WHERE report_id=case_id) THEN
    RAISE EXCEPTION 'test030_scoped_capability_not_removed';
  END IF;
  retry_result := reporting_private.redact_case(case_id,3,approval_ref);
  IF retry_result->>'already_cleared' IS DISTINCT FROM 'true'
    OR (SELECT count(*) FROM reporting_private.redaction_receipts WHERE report_id=case_id)<>1
    OR (SELECT count(*) FROM reporting_private.operation_events WHERE report_id=case_id AND action='sensitive_content_cleared')<>1 THEN
    RAISE EXCEPTION 'test030_same_reference_retry_not_idempotent';
  END IF;
  blocked := false;
  BEGIN
    PERFORM reporting_private.redact_case(case_id,3,'TEST030-Conflicting-' || case_id::text);
  EXCEPTION WHEN SQLSTATE 'PT409' THEN
    blocked := SQLERRM = 'report_request_conflict';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_different_reference_retry_not_conflict'; END IF;
  blocked := false;
  BEGIN
    UPDATE reporting_private.redaction_receipts SET result='{}'::jsonb WHERE report_id=case_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_receipt_update_not_denied'; END IF;
  blocked := false;
  BEGIN
    DELETE FROM reporting_private.redaction_receipts WHERE report_id=case_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_receipt_delete_not_denied'; END IF;
  blocked := false;
  BEGIN
    UPDATE reporting_private.review_events SET internal_note='not permitted after clear' WHERE id=review_event_id;
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := SQLERRM = 'report_audit_immutable';
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'test030_postclear_audit_guard_not_restored'; END IF;

  RAISE NOTICE 'TASK030 management assertions passed inside rollback-only transaction: policy+holds, immutable guards, complete sensitive categories, exact aftercall rollback, preserved event metadata, idempotent receipt. No identifiers or original text emitted.';
END;
$test030$;
ROLLBACK;
