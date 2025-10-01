import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Refresh,
  ExpandMore,
  CloudDone,
  Warning,
  OpenInNew,
  CloudUpload
} from '@mui/icons-material';

const UploadResults = ({ results, onReset, onNewUpload }) => {
  if (!results) return null;

  const { 
    successCount, 
    errorCount, 
    totalProcessed, 
    results: successResults, 
    errors,
    projectId,
    mapId
  } = results;

  const createDroneDeployLink = (annotationId) => {
    if (!projectId || !mapId || !annotationId) return null;
    
    // Extract just the alphanumeric ID from "Annotation:xxxxx" format
    const cleanAnnotationId = annotationId.replace('Annotation:', '');
    const cleanMapId = mapId.replace('MapPlan:', '');
    const cleanProjectId = projectId.replace('Project:', '');
    
    return `https://www.dronedeploy.com/app2/sites/${cleanProjectId}/maps/${cleanMapId}?view=Annotation&viewId=${cleanAnnotationId}`;
  };

  const getOverallStatus = () => {
    if (errorCount === 0) {
      return {
        severity: 'success',
        icon: <CloudDone />,
        title: 'Upload Completed Successfully!',
        message: `All ${successCount} annotations were uploaded to DroneDeploy.`
      };
    } else if (successCount === 0) {
      return {
        severity: 'error',
        icon: <Error />,
        title: 'Upload Failed',
        message: `None of the ${totalProcessed} annotations could be uploaded.`
      };
    } else {
      return {
        severity: 'warning',
        icon: <Warning />,
        title: 'Partial Upload Success',
        message: `${successCount} of ${totalProcessed} annotations were uploaded successfully.`
      };
    }
  };

  const status = getOverallStatus();

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Step 4: Upload Results
      </Typography>
      
      <Paper elevation={2} sx={{ 
        p: 4, 
        mb: 4,
        borderRadius: 3,
        background: 'rgba(26, 26, 26, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <Alert severity={status.severity} icon={status.icon} sx={{ mb: 3 }}>
          <Typography variant="h6" component="div" gutterBottom>
            {status.title}
          </Typography>
          <Typography variant="body2">
            {status.message}
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: '#FAAF33' }}>
              {successCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Successful
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="error.main">
              {errorCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Failed
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {totalProcessed}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
          </Box>
        </Box>

        {successResults && successResults.length > 0 && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="subtitle1">
                  Successful Uploads ({successResults.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Annotation</TableCell>
                      <TableCell>DroneDeploy ID</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {successResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.annotation}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {createDroneDeployLink(result.id) ? (
                            <Link
                              href={createDroneDeployLink(result.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5,
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              {result.id}
                              <OpenInNew fontSize="small" />
                            </Link>
                          ) : (
                            result.id
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={<CheckCircle />}
                            label="Uploaded" 
                            color="success" 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        )}

        {errors && errors.length > 0 && (
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Error color="error" />
                <Typography variant="subtitle1">
                  Failed Uploads ({errors.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Annotation</TableCell>
                      <TableCell>Error Message</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {errors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.annotation}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error">
                            {error.error}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={<Error />}
                            label="Failed" 
                            color="error" 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        )}

        {errorCount > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Common reasons for upload failures:</strong>
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Invalid coordinates (out of bounds)</li>
              <li>Malformed geometry data</li>
              <li>API rate limiting</li>
              <li>Insufficient permissions for the MapPlan</li>
              <li>Network connectivity issues</li>
            </ul>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onReset}
            startIcon={<Refresh />}
            size="large"
          >
            Start Over
          </Button>
          <Button
            variant="contained"
            onClick={onNewUpload}
            startIcon={<CloudUpload />}
            size="large"
          >
            Upload Another File
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UploadResults;
