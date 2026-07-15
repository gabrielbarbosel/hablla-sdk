/** Domain enums extracted from openapi.json (generated — do not edit by hand). */

/**
 * AnnotationType — generated from openapi.json.
 * Used by: annotations.person, annotations.type.
 */
export const AnnotationType = [
    { code: 'text' },
    { code: 'image' },
    { code: 'video' },
    { code: 'document' },
    { code: 'json' },
] as const;
export type AnnotationTypeCode = (typeof AnnotationType)[number]['code'];

/**
 * CardStatus — generated from openapi.json.
 * Used by: boards.name, boards.status, cards.name, cards.status.
 */
export const CardStatus = [
    { code: 'in_attendance' },
    { code: 'won' },
    { code: 'lost' },
    { code: 'paused' },
] as const;
export type CardStatusCode = (typeof CardStatus)[number]['code'];

/**
 * ConnectionChannel — generated from openapi.json.
 * Used by: connections.name, connections.type.
 */
export const ConnectionChannel = [
    { code: 'email' },
    { code: 'gupshup' },
    { code: 'whatsapp' },
    { code: 'instagram' },
    { code: 'facebook' },
    { code: 'telegram' },
    { code: 'phone' },
    { code: 'phone_gti' },
    { code: 'generic' },
    { code: 'chat_api' },
    { code: 'social_media' },
    { code: 'webchat' },
    { code: 'magalu' },
] as const;
export type ConnectionChannelCode = (typeof ConnectionChannel)[number]['code'];

/**
 * ConnectionStatus — generated from openapi.json.
 * Used by: connections.generic_type, connections.status.
 */
export const ConnectionStatus = [
    { code: 'active' },
    { code: 'inactive' },
    { code: 'deleted' },
    { code: 'pending' },
] as const;
export type ConnectionStatusCode = (typeof ConnectionStatus)[number]['code'];

/**
 * ConnectionType — generated from openapi.json.
 * Used by: connections.type.
 */
export const ConnectionType = [
    { code: 'account_alerts' },
    { code: 'account_review_update' },
    { code: 'account_update' },
    { code: 'business_capability_update' },
    { code: 'history' },
    { code: 'message_template_components_update' },
    { code: 'message_template_quality_update' },
    { code: 'message_template_status_update' },
    { code: 'messages' },
    { code: 'partner_solutions' },
    { code: 'payment_configuration_update' },
    { code: 'phone_number_name_update' },
    { code: 'phone_number_quality_update' },
    { code: 'smb_app_state_sync' },
    { code: 'smb_message_echoes' },
    { code: 'template_category_update' },
    { code: 'user_preferences' },
] as const;
export type ConnectionTypeCode = (typeof ConnectionType)[number]['code'];

/**
 * EventType — generated from openapi.json.
 * Used by: events.person, events.event_type.
 */
export const EventType = [
    { code: 'conversion' },
    { code: 'person_created' },
    { code: 'person_updated' },
    { code: 'person_deleted' },
    { code: 'person_merged' },
    { code: 'person_blocked' },
    { code: 'person_unblocked' },
    { code: 'person_tag_added' },
    { code: 'person_tag_removed' },
    { code: 'person_follower_added' },
    { code: 'person_follower_removed' },
    { code: 'person_sector_added' },
    { code: 'person_sector_removed' },
    { code: 'person_user_added' },
    { code: 'person_user_removed' },
    { code: 'person_organization_added' },
    { code: 'person_organization_removed' },
    { code: 'organization_created' },
    { code: 'organization_updated' },
    { code: 'organization_deleted' },
    { code: 'organization_tag_added' },
    { code: 'organization_tag_removed' },
    { code: 'organization_person_added' },
    { code: 'organization_person_removed' },
    { code: 'organization_merged' },
    { code: 'card_created' },
    { code: 'card_updated' },
    { code: 'card_deleted' },
    { code: 'card_moved' },
    { code: 'card_in_attendance' },
    { code: 'card_won' },
    { code: 'card_lost' },
    { code: 'card_tag_added' },
    { code: 'card_tag_removed' },
    { code: 'card_paused' },
    { code: 'bot_started' },
    { code: 'bot_finished' },
    { code: 'chat_started' },
    { code: 'chat_finished' },
    { code: 'chat_expired' },
    { code: 'call_started' },
    { code: 'call_finished' },
    { code: 'email_received' },
    { code: 'email_sent' },
    { code: 'cf_updated' },
    { code: 'login' },
    { code: 'logout' },
    { code: 'session_expired' },
    { code: 'online' },
    { code: 'offline' },
    { code: 'service_created' },
    { code: 'service_updated' },
    { code: 'service_in_queue' },
    { code: 'service_in_attendance' },
    { code: 'service_in_bot' },
    { code: 'service_feedback' },
    { code: 'service_finished' },
    { code: 'service_transfer' },
    { code: 'service_summary' },
    { code: 'service_tag_added' },
    { code: 'service_tag_removed' },
    { code: 'service_custom_field_added' },
    { code: 'service_custom_field_removed' },
    { code: 'user_available' },
    { code: 'user_unavailable' },
    { code: 'user_available_to_call' },
    { code: 'user_unavailable_to_call' },
    { code: 'task_created' },
    { code: 'task_updated' },
    { code: 'dictionary_data_created' },
    { code: 'dictionary_data_updated' },
    { code: 'dictionary_data_deleted' },
    { code: 'start_work_shift' },
    { code: 'end_work_shift' },
    { code: 'annotation_created' },
    { code: 'annotation_updated' },
    { code: 'annotation_deleted' },
] as const;
export type EventTypeCode = (typeof EventType)[number]['code'];

/**
 * OrganizationStatus — generated from openapi.json.
 * Used by: organizations.search, organizations.status.
 */
export const OrganizationStatus = [
    { code: 'prospect' },
    { code: 'engaged' },
    { code: 'in_negotiation' },
    { code: 'active_client' },
    { code: 'inactive_client' },
    { code: 'partner' },
    { code: 'advocate' },
    { code: 'lost' },
    { code: 'not_a_fit' },
] as const;
export type OrganizationStatusCode = (typeof OrganizationStatus)[number]['code'];

/**
 * PersonCustomerStatus — generated from openapi.json.
 * Used by: persons.updated_at, persons.customer_status.
 */
export const PersonCustomerStatus = [
    { code: 'visitor' },
    { code: 'lead' },
    { code: 'marketing_qualified_lead' },
    { code: 'sales_qualified_lead' },
    { code: 'opportunity' },
    { code: 'customer' },
    { code: 'evangelist' },
    { code: 'ex_customer' },
] as const;
export type PersonCustomerStatusCode = (typeof PersonCustomerStatus)[number]['code'];

/**
 * Priority — generated from openapi.json.
 * Used by: boards.custom_fields, cards.has_next_task.
 */
export const Priority = [
    { code: 'low' },
    { code: 'medium' },
    { code: 'high' },
    { code: 'critical' },
] as const;
export type PriorityCode = (typeof Priority)[number]['code'];

/**
 * ProductCurrencyCode — generated from openapi.json.
 * Used by: products.name, products.currency_code.
 */
export const ProductCurrencyCode = [
    { code: 'AED' },
    { code: 'AFN' },
    { code: 'ALL' },
    { code: 'AMD' },
    { code: 'ANG' },
    { code: 'AOA' },
    { code: 'ARS' },
    { code: 'AUD' },
    { code: 'AWG' },
    { code: 'AZN' },
    { code: 'BAM' },
    { code: 'BBD' },
    { code: 'BDT' },
    { code: 'BGN' },
    { code: 'BHD' },
    { code: 'BIF' },
    { code: 'BMD' },
    { code: 'BND' },
    { code: 'BOB' },
    { code: 'BOV' },
    { code: 'BRL' },
    { code: 'BSD' },
    { code: 'BTN' },
    { code: 'BWP' },
    { code: 'BYN' },
    { code: 'BZD' },
    { code: 'CAD' },
    { code: 'CDF' },
    { code: 'CHE' },
    { code: 'CHF' },
    { code: 'CHW' },
    { code: 'CLF' },
    { code: 'CLP' },
    { code: 'CNY' },
    { code: 'COP' },
    { code: 'COU' },
    { code: 'CRC' },
    { code: 'CUC' },
    { code: 'CUP' },
    { code: 'CVE' },
    { code: 'CZK' },
    { code: 'DJF' },
    { code: 'DKK' },
    { code: 'DOP' },
    { code: 'DZD' },
    { code: 'EGP' },
    { code: 'ERN' },
    { code: 'ETB' },
    { code: 'EUR' },
    { code: 'FJD' },
    { code: 'FKP' },
    { code: 'GBP' },
    { code: 'GEL' },
    { code: 'GHS' },
    { code: 'GIP' },
    { code: 'GMD' },
    { code: 'GNF' },
    { code: 'GTQ' },
    { code: 'GYD' },
    { code: 'HKD' },
    { code: 'HNL' },
    { code: 'HRK' },
    { code: 'HTG' },
    { code: 'HUF' },
    { code: 'IDR' },
    { code: 'ILS' },
    { code: 'INR' },
    { code: 'IQD' },
    { code: 'IRR' },
    { code: 'ISK' },
    { code: 'JMD' },
    { code: 'JOD' },
    { code: 'JPY' },
    { code: 'KES' },
    { code: 'KGS' },
    { code: 'KHR' },
    { code: 'KMF' },
    { code: 'KPW' },
    { code: 'KRW' },
    { code: 'KWD' },
    { code: 'KYD' },
    { code: 'KZT' },
    { code: 'LAK' },
    { code: 'LBP' },
    { code: 'LKR' },
    { code: 'LRD' },
    { code: 'LSL' },
    { code: 'LYD' },
    { code: 'MAD' },
    { code: 'MDL' },
    { code: 'MGA' },
    { code: 'MKD' },
    { code: 'MMK' },
    { code: 'MNT' },
    { code: 'MOP' },
    { code: 'MRO' },
    { code: 'MUR' },
    { code: 'MVR' },
    { code: 'MWK' },
    { code: 'MXN' },
    { code: 'MXV' },
    { code: 'MYR' },
    { code: 'MZN' },
    { code: 'NAD' },
    { code: 'NGN' },
    { code: 'NIO' },
    { code: 'NOK' },
    { code: 'NPR' },
    { code: 'NZD' },
    { code: 'OMR' },
    { code: 'PAB' },
    { code: 'PEN' },
    { code: 'PGK' },
    { code: 'PHP' },
    { code: 'PKR' },
    { code: 'PLN' },
    { code: 'PYG' },
    { code: 'QAR' },
    { code: 'RON' },
    { code: 'RSD' },
    { code: 'RUB' },
    { code: 'RWF' },
    { code: 'SAR' },
    { code: 'SBD' },
    { code: 'SCR' },
    { code: 'SDG' },
    { code: 'SEK' },
    { code: 'SGD' },
    { code: 'SHP' },
    { code: 'SLL' },
    { code: 'SOS' },
    { code: 'SRD' },
    { code: 'SSP' },
    { code: 'STN' },
    { code: 'SVC' },
    { code: 'SYP' },
    { code: 'SZL' },
    { code: 'THB' },
    { code: 'TJS' },
    { code: 'TMT' },
    { code: 'TND' },
    { code: 'TOP' },
    { code: 'TRY' },
    { code: 'TTD' },
    { code: 'TWD' },
    { code: 'TZS' },
    { code: 'UAH' },
    { code: 'UGX' },
    { code: 'USD' },
    { code: 'USN' },
    { code: 'UYI' },
    { code: 'UYU' },
    { code: 'UZS' },
    { code: 'VES' },
    { code: 'VND' },
    { code: 'VUV' },
    { code: 'WST' },
    { code: 'XAF' },
    { code: 'XCD' },
    { code: 'XOF' },
    { code: 'XPF' },
    { code: 'YER' },
    { code: 'ZAR' },
    { code: 'ZMW' },
    { code: 'ZWL' },
] as const;
export type ProductCurrencyCodeCode = (typeof ProductCurrencyCode)[number]['code'];

/**
 * ReasonType — generated from openapi.json.
 * Used by: reasons.name, reasons.type.
 */
export const ReasonType = [
    { code: 'card_lost' },
    { code: 'card_won' },
    { code: 'service_done' },
    { code: 'service_archived' },
    { code: 'service_transfer' },
    { code: 'unavailable' },
] as const;
export type ReasonTypeCode = (typeof ReasonType)[number]['code'];

/**
 * RootPlanType — generated from openapi.json.
 * Used by: root.plan_type.
 */
export const RootPlanType = [
    { code: 'free' },
    { code: 'limit' },
    { code: 'on_demand' },
    { code: 'custom' },
] as const;
export type RootPlanTypeCode = (typeof RootPlanType)[number]['code'];

/**
 * RootType — generated from openapi.json.
 * Used by: root.name, root.type, root.owner.
 */
export const RootType = [
    { code: 'integration' },
    { code: 'omnichannel' },
    { code: 'marketing' },
    { code: 'kanban' },
] as const;
export type RootTypeCode = (typeof RootType)[number]['code'];

/**
 * SectorPermissionTarget — generated from openapi.json.
 * Used by: sectors.name, sectors.permission_target.
 */
export const SectorPermissionTarget = [
    { code: 'persons' },
    { code: 'services' },
    { code: 'cards' },
    { code: 'organizations' },
    { code: 'tasks' },
] as const;
export type SectorPermissionTargetCode = (typeof SectorPermissionTarget)[number]['code'];

/**
 * SectorRoleType — generated from openapi.json.
 * Used by: sectors.name, sectors.role_type, users.name, users.role_type.
 */
export const SectorRoleType = [
    { code: 'admin' },
    { code: 'user' },
] as const;
export type SectorRoleTypeCode = (typeof SectorRoleType)[number]['code'];

/**
 * SegmentationResultType — generated from openapi.json.
 * Used by: segmentations.result_type.
 */
export const SegmentationResultType = [
    { code: 'fixed' },
    { code: 'dynamic' },
] as const;
export type SegmentationResultTypeCode = (typeof SegmentationResultType)[number]['code'];

/**
 * SegmentationType — generated from openapi.json.
 * Used by: segmentations.name, segmentations.type.
 */
export const SegmentationType = [
    { code: 'person' },
    { code: 'organization' },
    { code: 'dynamic' },
] as const;
export type SegmentationTypeCode = (typeof SegmentationType)[number]['code'];

/**
 * ServiceChannel — generated from openapi.json.
 * Used by: services.user, services.type.
 */
export const ServiceChannel = [
    { code: 'call' },
    { code: 'email' },
    { code: 'whatsapp' },
    { code: 'facebook' },
    { code: 'instagram' },
    { code: 'telegram' },
    { code: 'chat_api' },
    { code: 'webchat' },
] as const;
export type ServiceChannelCode = (typeof ServiceChannel)[number]['code'];

/**
 * ServiceMessageType — generated from openapi.json.
 * Used by: services.user, services.type.
 */
export const ServiceMessageType = [
    { code: 'text' },
    { code: 'sticker' },
    { code: 'reaction' },
    { code: 'image' },
    { code: 'audio' },
    { code: 'video' },
    { code: 'document' },
    { code: 'file' },
    { code: 'location' },
    { code: 'contacts' },
    { code: 'interactive' },
    { code: 'button' },
    { code: 'system' },
    { code: 'email' },
    { code: 'comment' },
] as const;
export type ServiceMessageTypeCode = (typeof ServiceMessageType)[number]['code'];

/**
 * ServiceOrigin — generated from openapi.json.
 * Used by: services.user, services.type.
 */
export const ServiceOrigin = [
    { code: 'user' },
    { code: 'queue' },
    { code: 'bot' },
] as const;
export type ServiceOriginCode = (typeof ServiceOrigin)[number]['code'];

/**
 * ServiceStatus — generated from openapi.json.
 * Used by: services.status.
 */
export const ServiceStatus = [
    { code: 'pending' },
    { code: 'in_queue' },
    { code: 'in_attendance' },
    { code: 'in_bot' },
    { code: 'feedback' },
    { code: 'finished' },
] as const;
export type ServiceStatusCode = (typeof ServiceStatus)[number]['code'];

/**
 * SessionType — generated from openapi.json.
 * Used by: sessions.user_initiated, sessions.type.
 */
export const SessionType = [
    { code: 'gupshup' },
    { code: 'whatsapp' },
    { code: 'facebook' },
    { code: 'instagram' },
    { code: 'telegram' },
    { code: 'chat_api' },
    { code: 'webchat' },
] as const;
export type SessionTypeCode = (typeof SessionType)[number]['code'];

/**
 * TaskStatus — generated from openapi.json.
 * Used by: tasks.person, tasks.status.
 */
export const TaskStatus = [
    { code: 'pending' },
    { code: 'in_progress' },
    { code: 'paused' },
    { code: 'done' },
    { code: 'failed' },
] as const;
export type TaskStatusCode = (typeof TaskStatus)[number]['code'];

/**
 * TaskType — generated from openapi.json.
 * Used by: boards.created_at, boards.next_task_type, cards.created_at, cards.next_task_type, tasks.type.
 */
export const TaskType = [
    { code: 'call' },
    { code: 'email' },
    { code: 'meet' },
    { code: 'chat' },
    { code: 'other' },
] as const;
export type TaskTypeCode = (typeof TaskType)[number]['code'];

/**
 * TransferLogType — generated from openapi.json.
 * Used by: transfer-logs.flow, transfer-logs.type.
 */
export const TransferLogType = [
    { code: 'user' },
    { code: 'flow' },
    { code: 'supervisor' },
    { code: 'batch' },
    { code: 'auto_take' },
    { code: 'service_timer' },
] as const;
export type TransferLogTypeCode = (typeof TransferLogType)[number]['code'];
