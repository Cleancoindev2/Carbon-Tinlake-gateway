import React, { FunctionComponent, useCallback, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Box, Button, FormField, Heading, Select } from 'grommet';
import documentRoutes from './routes';
import { RouteComponentProps, withRouter } from 'react-router';
import { Document } from '@centrifuge/gateway-lib/models/document';
import { SecondaryHeader } from '../components/SecondaryHeader';
import { canCreateDocuments, canWriteToDoc } from '@centrifuge/gateway-lib/models/user';
import { Preloader } from '../components/Preloader';
import { formatDate } from '@centrifuge/gateway-lib/utils/formaters';
import { httpClient } from '../http-client';
import { AppContext } from '../App';
import { useMergeState } from '../hooks';
import { PageError } from '../components/PageError';
import { isValidAddress } from 'ethereumjs-util';
import { DataTableWithDynamicHeight } from '../components/DataTableWithDynamicHeight';
import { Schema } from '@centrifuge/gateway-lib/models/schema';
import { getSchemaLabel } from '@centrifuge/gateway-lib/utils/schema-utils';

type Props = RouteComponentProps;

type State = {
  documents: Document[];
  schemas: Schema[];
  loadingMessage: string | null;
  display: DisplayTypes
  error: any;
}

enum DisplayTypes {
  All = 'All',
  Sent = 'Sent',
  Received = 'Received'
}

const displayOptions: DisplayTypes[] = [DisplayTypes.All, DisplayTypes.Sent, DisplayTypes.Received];


export const ListDocuments: FunctionComponent<Props> = (props: Props) => {

  const {
    history: {
      push,
    },
  } = props;

  const [
    {
      loadingMessage,
      documents,
      schemas,
      display,
      error,
    },
    setState] = useMergeState<State>({
    documents: [],
    schemas: [],
    display: DisplayTypes.All,
    loadingMessage: 'Loading',
    error: null,
  });


  const { user } = useContext(AppContext);


  const displayPageError = useCallback((error) => {
    setState({
      loadingMessage: null,
      error,
    });
  }, [setState]);

  const loadData = useCallback(async () => {
    setState({
      loadingMessage: 'Loading',
    });
    try {

      const documents = (await httpClient.documents.list()).data;
      //get All schemas. We need to display even archived ones
      const schemas = (await httpClient.schemas.list()).data;
      setState({
        loadingMessage: null,
        schemas,
        documents,
      });

    } catch (e) {
      displayPageError(e);
    }
  }, [setState, displayPageError]);


  const getFilteredDocuments = () => {
    const sortableDocuments = documents.map((doc: any) => {
      return {
        ...doc,
        // Datable does not have support for nested props ex data.myValue
        // We need make the props accessible top level and we use a special
        // prefix in order to avoid overriding some prop
        $_reference_id: doc.attributes.reference_id && doc.attributes.reference_id.value,
        $_schema: doc.attributes._schema && getSchemaLabel(doc.attributes._schema.value, schemas),
      };
    });

    if (display !== DisplayTypes.All) {
      return sortableDocuments.filter(doc => {
        return display === DisplayTypes.Sent ? !isValidAddress(doc.fromId) : isValidAddress(doc.fromId);
      });
    }

    return sortableDocuments;
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loadingMessage) {
    return <Preloader message={loadingMessage}/>;
  }

  if (error) {
    return <PageError error={error}/>;
  }


  return (
    <Box>
      <SecondaryHeader>
        <Box direction={'row'} gap={'medium'} align="center">
          <Heading level="3">Documents</Heading>

          <Box width={'126px'}>
            <FormField>
              <Select
                name={'display'}
                options={displayOptions}
                value={display}
                onChange={(ev: any) => {
                  setState({ display: ev.value.toString() });
                }}
              />
            </FormField>
          </Box>
        </Box>
        <Link to={documentRoutes.new}>
          {canCreateDocuments(user!) && <Button
            primary
            label="Create Document"
          />}
        </Link>


      </SecondaryHeader>


      <Box pad={{ horizontal: 'medium' }}>
        <DataTableWithDynamicHeight
          sortable={true}
          data={getFilteredDocuments()}
          primaryKey={'_id'}
          columns={[
            {
              property: '$_reference_id',
              header: 'Reference ID',
              sortable: true,
            },

            {
              property: '$_schema',
              header: 'Schema',
              sortable: true,
            },

            {
              property: 'createdAt',
              header: 'Date created',
              sortable: true,
              render: datum => formatDate(datum.createdAt),
            },
            {
              property: '_id',
              header: 'Actions',
              sortable: false,
              render: datum => (
                <Box direction="row" gap="small">
                  <Anchor
                    label={'View'}
                    onClick={() =>
                      push(
                        documentRoutes.view.replace(':id', datum._id),
                      )
                    }
                  />
                  {canWriteToDoc(user!, datum) && <Anchor
                    label={'Edit'}
                    onClick={() =>
                      push(
                        documentRoutes.edit.replace(':id', datum._id),
                      )
                    }
                  />}
                </Box>
              ),
            },
          ]}
        />

      </Box>
    </Box>
  );
};


export default withRouter(ListDocuments);
