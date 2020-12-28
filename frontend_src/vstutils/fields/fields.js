import { APIDataField } from './api-data';
import { APIObjectField } from './api-object';
import { AutocompleteField } from './autocomplete';
import { BaseField } from './base';
import { BooleanField } from './boolean';
import { ButtonField } from './button';
import { ChoicesField } from './choices';
import { ColorField } from './color';
import { CrontabField } from './crontab';
import { DependFromFkField, DynamicField } from './dynamic';
import { EmailField } from './email';
import { FormField } from './form';
import { HiddenField } from './hidden';
import { InnerAPIObjectField } from './inner-api-object';
import { JSONField } from './json';
import { MultiselectField } from './multiselect';
import { PasswordField } from './password';
import * as datetime from './datetime';
import * as files from './files';
import * as fk from './fk';
import * as numbers from './numbers';
import * as text from './text';
import { mapToObjectProxy } from '../utils';

const globalFields = new Map([
    ['api_data', APIDataField],
    // ['api_object', APIObjectField],
    ['autocomplete', AutocompleteField],
    ['base', BaseField],
    ['binfile', files.binaryFile.BinaryFileField],
    ['boolean', BooleanField],
    ['button', ButtonField],
    ['choices', ChoicesField],
    ['color', ColorField],
    ['crontab', CrontabField],
    ['date', datetime.DateField],
    ['date-time', datetime.DateTimeField],
    ['date_time', datetime.DateTimeField], // TODO replace all use of date_time by date-time
    ['decimal', numbers.FloatField],
    ['dynamic_fk', DependFromFkField],
    ['double', numbers.DoubleField],
    ['dynamic', DynamicField],
    ['email', EmailField],
    ['file', files.file.FileField],
    ['fk', fk.fk.FKField],
    ['fk_autocomplete', fk.autocomolete.FKAutocompleteField],
    ['fk_multi_autocomplete', fk.multiAutocomplete.FKMultiAutocompleteField],
    ['float', numbers.FloatField],
    ['form', FormField],
    ['hidden', HiddenField],
    ['html', text.HTMLField],
    // ['inner_api_object', InnerAPIObjectField],
    ['int32', numbers.Int32Field],
    ['int64', numbers.Int64Field],
    ['integer', numbers.IntegerField],
    ['json', JSONField],
    ['multiplenamedbinfile', files.multipleNamedBinaryFile.MultipleNamedBinaryFileField],
    ['multiplenamedbinimage', files.multipleNamedBinaryImage.MultipleNamedBinaryImageField],
    ['multiselect', MultiselectField],
    ['namedbinfile', files.namedBinaryFile.NamedBinaryFileField],
    ['namedbinimage', files.namedBinaryImage.NamedBinaryImageField],
    ['number', numbers.NumberField],
    ['password', PasswordField],
    ['plain_text', text.PlainTextField],
    ['secretfile', files.secretFile.SecretFileField],
    ['string', text.StringField],
    ['string_array', text.StringArrayField],
    ['string_id', text.StringIDField],
    ['text_paragraph', text.TextParagraphField],
    ['textarea', text.TextAreaField],
    ['time_interval', datetime.TimeIntervalField],
    ['uptime', datetime.UptimeField],
]);

/**
 * @deprecated
 * @type {Object<string, BaseField>}
 */
const guiFields = mapToObjectProxy(globalFields);

export { globalFields, guiFields };
